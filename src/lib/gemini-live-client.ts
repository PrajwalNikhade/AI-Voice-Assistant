import { Language, TranscriptMessage } from "@/types";
import { getSystemPrompt } from "@/config/product-config";

export interface LiveClientCallbacks {
  onStatusChange: (status: "idle" | "connecting" | "connected" | "listening" | "speaking" | "error") => void;
  onTranscriptMessage: (msg: TranscriptMessage) => void;
  onError: (error: string) => void;
  onClose: () => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micProcessor: ScriptProcessorNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private aiOutputDestinationNode: AudioNode | null = null;
  private isConnected: boolean = false;
  private isMuted: boolean = false;
  private nextPlayTime: number = 0;
  private activeAudioSources: AudioBufferSourceNode[] = [];
  private callbacks: LiveClientCallbacks;
  private language: Language = "en";
  private currentAiMessageId: string | null = null;
  private currentAiMessageText: string = "";
  private currentCustomerMessageId: string | null = null;
  private recognition: unknown = null;

  // Diagnostic metrics
  private outboundAudioChunksCount: number = 0;
  private inboundAudioChunksCount: number = 0;
  private lastMicLogTime: number = 0;

  constructor(callbacks: LiveClientCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Connects to Gemini Live API via WebSocket using the ephemeral token
   */
  public async connect(
    token: string,
    model: string,
    voiceName: string = "Puck",
    language: Language = "en",
    micStream: MediaStream,
    aiOutputDestinationNode: AudioNode | null = null,
    sharedAudioContext?: AudioContext
  ): Promise<void> {
    this.language = language;
    this.micStream = micStream;
    this.aiOutputDestinationNode = aiOutputDestinationNode;
    this.outboundAudioChunksCount = 0;
    this.inboundAudioChunksCount = 0;
    this.currentAiMessageId = null;
    this.currentAiMessageText = "";

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = sharedAudioContext || new AudioCtx();
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    console.log(`[GeminiLive] Initiating connection to model: ${model}, voice: ${voiceName}, language: ${language}`);
    this.callbacks.onStatusChange("connecting");

    // Endpoint for constrained ephemeral tokens
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${token}`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e) {
      this.callbacks.onError(`Failed to create WebSocket connection: ${(e as Error).message}`);
      this.callbacks.onStatusChange("error");
      return;
    }

    this.ws.onopen = () => {
      this.isConnected = true;
      console.log("[GeminiLive] WebSocket connection established successfully.");
      this.callbacks.onStatusChange("connected");

      // Send initial setup message
      const systemInstruction = getSystemPrompt(this.language);
      const setupMessage = {
        setup: {
          model: `models/${model}`,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName || "Puck",
                },
              },
            },
          },
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      };

      this.ws?.send(JSON.stringify(setupMessage));
      console.log("[GeminiLive] Setup handshake message transmitted.");

      // Start processing and streaming mic audio
      this.startMicStreaming();
      // Setup supplementary browser speech recognition for reliable live captions
      this.initBrowserSpeechRecognition();
    };

    this.ws.onmessage = async (event: MessageEvent) => {
      try {
        let data: unknown;
        if (event.data instanceof Blob) {
          const text = await event.data.text();
          data = JSON.parse(text);
        } else if (typeof event.data === "string") {
          data = JSON.parse(event.data);
        }

        if (data) {
          this.handleServerMessage(data as Record<string, unknown>);
        }
      } catch (err) {
        console.warn("[GeminiLive] Failed to parse incoming WebSocket message:", err);
      }
    };

    this.ws.onerror = (err) => {
      console.error("[GeminiLive] WebSocket transport error:", err);
      this.callbacks.onError(
        "WebSocket connection error with Gemini Live API. Please verify network connectivity."
      );
      this.callbacks.onStatusChange("error");
    };

    this.ws.onclose = (event) => {
      console.log(`[GeminiLive] WebSocket connection closed. Code: ${event.code}, Clean: ${event.wasClean}`);
      this.isConnected = false;
      this.cleanupAudio();
      this.callbacks.onClose();
    };
  }

  /**
   * Initializes browser speech recognition for instant, low-latency live captions
   */
  private initBrowserSpeechRecognition(): void {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    try {
      const recognition = new (SpeechRecognition as new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: (e: unknown) => void;
        onerror: (e: unknown) => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      })();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang =
        this.language === "hi" ? "hi-IN" : this.language === "mr" ? "mr-IN" : "en-US";

      let finalIndex = 0;
      recognition.onresult = (event: unknown) => {
        const e = event as {
          resultIndex: number;
          results: Array<{
            isFinal: boolean;
            [index: number]: { transcript: string };
          }>;
        };

        for (let i = e.resultIndex; i < e.results.length; ++i) {
          const transcriptText = e.results[i][0].transcript.trim();
          if (!transcriptText) continue;

          if (e.results[i].isFinal) {
            console.log(`[GeminiLive] Customer final speech detected (${transcriptText.length} chars)`);
            this.callbacks.onTranscriptMessage({
              id: `user-${Date.now()}-${finalIndex++}`,
              speaker: "customer",
              text: transcriptText,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              isFinal: true,
            });
            this.currentCustomerMessageId = null;
          } else {
            // Interim speech
            const tempId = this.currentCustomerMessageId || `user-interim-${Date.now()}`;
            this.currentCustomerMessageId = tempId;
            this.callbacks.onTranscriptMessage({
              id: tempId,
              speaker: "customer",
              text: transcriptText,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              isFinal: false,
            });
          }
        }
      };

      recognition.onerror = () => {
        // Silent error for optional recognition
      };

      recognition.onend = () => {
        if (this.isConnected) {
          try {
            recognition.start();
          } catch {
            // ignore
          }
        }
      };

      recognition.start();
      this.recognition = recognition;
      console.log("[GeminiLive] Supplementary browser speech recognition active.");
    } catch (e) {
      console.warn("[GeminiLive] Could not start supplementary speech recognition:", e);
    }
  }

  /**
   * Handles incoming server messages from Gemini Live
   */
  private handleServerMessage(message: Record<string, unknown>): void {
    // 1. Setup complete -> Trigger AI's opening greeting
    if (message.setupComplete) {
      console.log("[GeminiLive] Event: setupComplete received. Triggering opening greeting.");
      this.sendInitialGreetingPrompt();
      return;
    }

    const serverContent = message.serverContent as Record<string, unknown> | undefined;
    if (!serverContent) return;

    // 2. Interruption handling: User started speaking while AI was talking
    if (serverContent.interrupted) {
      console.log("[GeminiLive] Event: interrupted. Stopping AI audio playback immediately.");
      this.stopAiAudioPlayback();
      this.callbacks.onStatusChange("listening");
      return;
    }

    // 3. Model turn: Extract audio chunks and output text
    const modelTurn = serverContent.modelTurn as {
      parts?: Array<{
        text?: string;
        thought?: boolean;
        inlineData?: { mimeType: string; data: string };
      }>;
    };

    if (modelTurn?.parts) {
      for (const part of modelTurn.parts) {
        // Filter out any internal thought tokens or planning parts
        if (part.thought) {
          console.log("[GeminiLive] Filtered internal thought token from modelTurn.");
          continue;
        }

        // Output text from model: ensure we don't display internal commentary
        if (part.text) {
          const trimmed = part.text.trim();
          const isThoughtCommentary =
            /^(\*|\(|\[)?(refining|thinking|drafting|planning|internal|composing)/i.test(trimmed);

          if (!isThoughtCommentary) {
            this.handleAiTranscriptChunk(part.text);
          } else {
            console.log("[GeminiLive] Filtered planning commentary from modelTurn:", trimmed);
          }
        }

        // Output audio from model
        if (part.inlineData && part.inlineData.mimeType.startsWith("audio/pcm")) {
          this.inboundAudioChunksCount++;
          this.callbacks.onStatusChange("speaking");
          const pcmData = this.base64ToArrayBuffer(part.inlineData.data);
          // Standard Live API audio output is 24000Hz 16-bit mono PCM
          this.playPcmAudioChunk(pcmData, 24000);
        }
      }
    }

    // 4. Input audio transcription (customer speech recognized by Gemini Live)
    const inputTranscription =
      (serverContent.inputAudioTranscription || serverContent.input_transcription) as
        | { text?: string }
        | undefined;
    if (inputTranscription?.text) {
      const text = inputTranscription.text.trim();
      if (text) {
        console.log(`[GeminiLive] Event: inputAudioTranscription (${text.length} chars)`);
        this.callbacks.onTranscriptMessage({
          id: `cust-live-${Date.now()}`,
          speaker: "customer",
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          isFinal: true,
        });
      }
    }

    // 5. Output audio transcription (AI speech transcription recognized by Gemini Live)
    const outputTranscription =
      (serverContent.outputAudioTranscription || serverContent.output_transcription) as
        | { text?: string }
        | undefined;
    if (outputTranscription?.text) {
      const trimmed = outputTranscription.text.trim();
      if (!/^(\*|\(|\[)?(refining|thinking|drafting|planning)/i.test(trimmed)) {
        this.handleAiTranscriptChunk(outputTranscription.text);
      }
    }

    // 6. Turn complete
    if (serverContent.turnComplete) {
      console.log(`[GeminiLive] Event: turnComplete. Inbound audio chunks so far: ${this.inboundAudioChunksCount}`);
      // Finalize the current AI message if pending
      if (this.currentAiMessageId && this.currentAiMessageText) {
        this.callbacks.onTranscriptMessage({
          id: this.currentAiMessageId,
          speaker: "ai",
          text: this.currentAiMessageText.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          isFinal: true,
        });
      }
      this.currentAiMessageId = null;
      this.currentAiMessageText = "";

      // Wait for queued audio to finish playing before switching back to "listening"
      setTimeout(() => {
        if (this.isConnected && this.activeAudioSources.length === 0) {
          this.callbacks.onStatusChange("listening");
        }
      }, 500);
    }
  }

  /**
   * Appends or creates AI transcript message (accumulates streamed chunks)
   */
  private handleAiTranscriptChunk(chunkText: string): void {
    if (!chunkText) return;

    if (!this.currentAiMessageId) {
      this.currentAiMessageId = `ai-${Date.now()}`;
      this.currentAiMessageText = "";
    }

    this.currentAiMessageText += chunkText;

    this.callbacks.onTranscriptMessage({
      id: this.currentAiMessageId,
      speaker: "ai",
      text: this.currentAiMessageText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      isFinal: false,
    });
  }

  /**
   * Sends an initial turn to start the conversation naturally with the AI's greeting
   */
  private sendInitialGreetingPrompt(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Direct command to deliver the opening customer greeting immediately without internal thinking
    let greetingCommand =
      "Please speak your opening greeting directly to the customer right now: 'Hi there! I'm Alex from ResumePilot AI. What kind of job or internship are you looking for?' Do not include any thoughts or planning commentary.";
    if (this.language === "hi") {
      greetingCommand =
        "कृपया ग्राहक से सीधे हिंदी में अपना प्रारंभिक अभिवादन बोलें: 'नमस्ते! मैं ResumePilot AI से एलेक्स बात कर रहा हूँ। क्या आप अभी किसी नई नौकरी या इंटर्नशिप की तैयारी कर रहे हैं?' कोई आंतरिक विचार न बोलें।";
    } else if (this.language === "mr") {
      greetingCommand =
        "कृपया ग्राहकाशी थेट मराठीत बोला: 'नमस्कार! मी ResumePilot AI कडून अ‍ॅलेक्स बोलत आहे. सध्या तुम्ही नवीन नोकरी किंवा इंटर्नशिप शोधत आहात का?' कोणताही विचार न दाखवता थेट बोला.";
    }

    const greetingMessage = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text: greetingCommand }],
          },
        ],
        turnComplete: true,
      },
    };

    console.log("[GeminiLive] Transmitting direct opening greeting command.");
    this.ws.send(JSON.stringify(greetingMessage));
    this.callbacks.onStatusChange("listening");
  }

  /**
   * Downsamples microphone audio to 16kHz 16-bit PCM and streams via WebSocket
   */
  private startMicStreaming(): void {
    if (!this.audioContext || !this.micStream) return;

    const bufferSize = 4096;
    this.micSource = this.audioContext.createMediaStreamSource(this.micStream);
    this.micProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.micProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
      if (!this.isConnected || this.isMuted) return;

      const inputBuffer = event.inputBuffer.getChannelData(0);
      const inputSampleRate = event.inputBuffer.sampleRate;
      const targetSampleRate = 16000;

      // Diagnostic audio level calculation
      let sumSquares = 0;
      for (let i = 0; i < inputBuffer.length; i++) {
        sumSquares += inputBuffer[i] * inputBuffer[i];
      }
      const rms = Math.sqrt(sumSquares / inputBuffer.length);

      const now = Date.now();
      if (now - this.lastMicLogTime > 4000) {
        this.lastMicLogTime = now;
        console.log(
          `[GeminiLive] Mic streaming active: ${this.outboundAudioChunksCount} chunks sent, current RMS: ${rms.toFixed(4)}`
        );
      }

      // Downsample to 16kHz
      const downsampledBuffer = this.downsampleTo16k(
        inputBuffer,
        inputSampleRate,
        targetSampleRate
      );

      // Convert float32 [-1, 1] to Int16 PCM
      const pcm16 = new Int16Array(downsampledBuffer.length);
      for (let i = 0; i < downsampledBuffer.length; i++) {
        const s = Math.max(-1, Math.min(1, downsampledBuffer[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Convert to Base64 and send
      const base64Data = this.arrayBufferToBase64(pcm16.buffer);
      this.sendRealtimeAudio(base64Data);
    };

    this.micSource.connect(this.micProcessor);
    // Connect to destination with 0 gain / dummy to keep processor running
    const dummyGain = this.audioContext.createGain();
    dummyGain.gain.value = 0;
    this.micProcessor.connect(dummyGain);
    dummyGain.connect(this.audioContext.destination);
  }

  /**
   * Downsamples Float32 audio buffer from inputSampleRate to 16000Hz
   */
  private downsampleTo16k(
    buffer: Float32Array,
    inputSampleRate: number,
    targetSampleRate: number
  ): Float32Array {
    if (inputSampleRate === targetSampleRate) return buffer;
    const ratio = inputSampleRate / targetSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  /**
   * Sends audio chunk in Gemini Live API format
   */
  private sendRealtimeAudio(base64Data: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.outboundAudioChunksCount++;

    const realtimeInput = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: "audio/pcm;rate=16000",
            data: base64Data,
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(realtimeInput));
  }

  /**
   * Plays incoming 24kHz 16-bit mono PCM audio in continuous seamless queue
   */
  private playPcmAudioChunk(pcmBuffer: ArrayBuffer, sampleRate: number = 24000): void {
    if (!this.audioContext) return;

    const int16 = new Int16Array(pcmBuffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const audioBuf = this.audioContext.createBuffer(1, float32.length, sampleRate);
    audioBuf.copyToChannel(float32, 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuf;

    // Route audio to recording mixer (if provided) and to speakers
    if (this.aiOutputDestinationNode) {
      source.connect(this.aiOutputDestinationNode);
    } else {
      source.connect(this.audioContext.destination);
    }

    const currentTime = this.audioContext.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime + 0.05; // tiny buffer to avoid jitter
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuf.duration;

    this.activeAudioSources.push(source);
    source.onended = () => {
      const idx = this.activeAudioSources.indexOf(source);
      if (idx !== -1) {
        this.activeAudioSources.splice(idx, 1);
      }
      if (this.activeAudioSources.length === 0 && this.isConnected) {
        this.callbacks.onStatusChange("listening");
      }
    };
  }

  /**
   * Immediately stops all currently playing AI audio (for customer interruption)
   */
  private stopAiAudioPlayback(): void {
    for (const src of this.activeAudioSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeAudioSources = [];
    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
  }

  /**
   * Helper: ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Helper: Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Closes the session and cleans up audio resources
   */
  public disconnect(): void {
    this.isConnected = false;

    if (this.recognition) {
      try {
        (this.recognition as { stop: () => void }).stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }

    if (this.ws) {
      try {
        this.ws.close(1000, "Call ended by user");
      } catch {
        // ignore
      }
      this.ws = null;
    }

    this.cleanupAudio();
    this.callbacks.onStatusChange("idle");
  }

  private cleanupAudio(): void {
    this.stopAiAudioPlayback();

    if (this.micProcessor) {
      try {
        this.micProcessor.disconnect();
      } catch {
        // ignore
      }
      this.micProcessor = null;
    }

    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {
        // ignore
      }
      this.micSource = null;
    }
  }
}
