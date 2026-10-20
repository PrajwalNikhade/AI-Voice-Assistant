/**
 * Dual-channel Web Audio mixer and MediaRecorder pipeline.
 * Mixes microphone input and Gemini AI audio output into a shared MediaStreamDestination
 * so the saved recording contains both sides of the live voice conversation.
 */
export class AudioRecordingPipeline {
  private audioContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private mixedDestination: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private selectedMimeType: string = "audio/webm";
  private isRecording: boolean = false;
  private micAnalyser: AnalyserNode | null = null;
  private aiAnalyser: AnalyserNode | null = null;

  constructor(existingAudioContext?: AudioContext) {
    if (existingAudioContext) {
      this.audioContext = existingAudioContext;
    }
  }

  /**
   * Detects the best supported audio MIME type in the browser
   */
  public static getSupportedMimeType(): string {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
      return "audio/webm";
    }
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/aac",
    ];
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return "";
  }

  /**
   * Initializes the audio context and mixing pipeline with microphone stream
   */
  public async initialize(micStream: MediaStream): Promise<void> {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.micStream = micStream;
    this.mixedDestination = this.audioContext.createMediaStreamDestination();

    // Create Analyser for microphone levels
    this.micAnalyser = this.audioContext.createAnalyser();
    this.micAnalyser.fftSize = 256;

    // Connect mic -> micAnalyser -> mixedDestination (do NOT connect mic to speakers to avoid echo!)
    this.micSource = this.audioContext.createMediaStreamSource(micStream);
    this.micSource.connect(this.micAnalyser);
    this.micAnalyser.connect(this.mixedDestination);

    // Create Analyser for AI output
    this.aiAnalyser = this.audioContext.createAnalyser();
    this.aiAnalyser.fftSize = 256;
    // aiAnalyser routes to both mixedDestination (recording) and audioContext.destination (speakers)
    this.aiAnalyser.connect(this.mixedDestination);
    this.aiAnalyser.connect(this.audioContext.destination);

    this.selectedMimeType = AudioRecordingPipeline.getSupportedMimeType();
  }

  /**
   * Returns node to which incoming decoded AI audio should connect
   */
  public getAiInputNode(): AudioNode | null {
    return this.aiAnalyser;
  }

  /**
   * Returns the active AudioContext
   */
  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Starts recording the mixed audio stream
   */
  public startRecording(): void {
    if (!this.mixedDestination) {
      throw new Error("Audio pipeline not initialized.");
    }
    if (this.isRecording) return;

    this.recordedChunks = [];
    const options: MediaRecorderOptions = {};
    if (this.selectedMimeType) {
      options.mimeType = this.selectedMimeType;
    }

    try {
      this.mediaRecorder = new MediaRecorder(this.mixedDestination.stream, options);
    } catch {
      this.mediaRecorder = new MediaRecorder(this.mixedDestination.stream);
      this.selectedMimeType = this.mediaRecorder.mimeType || "audio/webm";
    }

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    // Request data in chunks every 500ms
    this.mediaRecorder.start(500);
    this.isRecording = true;
  }

  /**
   * Stops recording and returns finalized playable Blob
   */
  public async stopRecording(): Promise<{ blob: Blob; mimeType: string } | null> {
    if (!this.mediaRecorder || !this.isRecording) {
      return null;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mime = this.selectedMimeType || "audio/webm";
        const completeBlob = new Blob(this.recordedChunks, { type: mime });
        this.isRecording = false;
        resolve({ blob: completeBlob, mimeType: mime });
      };

      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.warn("MediaRecorder stop error:", e);
        const mime = this.selectedMimeType || "audio/webm";
        const completeBlob = new Blob(this.recordedChunks, { type: mime });
        this.isRecording = false;
        resolve({ blob: completeBlob, mimeType: mime });
      }
    });
  }

  /**
   * Gets current real audio energy level for microphone (0.0 to 1.0)
   */
  public getMicLevel(): number {
    if (!this.micAnalyser) return 0;
    const buffer = new Uint8Array(this.micAnalyser.frequencyBinCount);
    this.micAnalyser.getByteFrequencyData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    const avg = sum / buffer.length;
    return Math.min(1, avg / 128);
  }

  /**
   * Gets current real audio energy level for AI voice playback (0.0 to 1.0)
   */
  public getAiLevel(): number {
    if (!this.aiAnalyser) return 0;
    const buffer = new Uint8Array(this.aiAnalyser.frequencyBinCount);
    this.aiAnalyser.getByteFrequencyData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    const avg = sum / buffer.length;
    return Math.min(1, avg / 128);
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.isRecording = false;

    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {
        // ignore
      }
      this.micSource = null;
    }

    if (this.micAnalyser) {
      try {
        this.micAnalyser.disconnect();
      } catch {
        // ignore
      }
      this.micAnalyser = null;
    }

    if (this.aiAnalyser) {
      try {
        this.aiAnalyser.disconnect();
      } catch {
        // ignore
      }
      this.aiAnalyser = null;
    }

    this.mixedDestination = null;
  }
}
