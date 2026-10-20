"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Globe,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Bot,
  User,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Gift,
  ArrowRight,
  Database,
} from "lucide-react";
import { Language, SalesStatus, TranscriptMessage, CallRecord, AISummary } from "@/types";
import { PRODUCT_CONFIG } from "@/config/product-config";
import { GeminiLiveClient } from "@/lib/gemini-live-client";
import { AudioRecordingPipeline } from "@/lib/audio-recorder";
import { persistCall } from "@/lib/storage-adapter";
import AudioVisualizer from "@/components/AudioVisualizer";
import ConsentDialog from "@/components/ConsentDialog";
import DemoSignupModal from "@/components/DemoSignupModal";
import AudioPlayer from "@/components/AudioPlayer";
import { getStatusBadge } from "@/components/CallDetailsModal";

export default function VoiceAgentPage() {
  // Session states
  const [callActive, setCallActive] = useState<boolean>(false);
  const [callStatus, setCallStatus] = useState<
    "idle" | "connecting" | "connected" | "listening" | "speaking" | "error"
  >("idle");
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Language & Consent
  const [language, setLanguage] = useState<Language>("en");
  const [isConsentModalOpen, setIsConsentModalOpen] = useState<boolean>(false);
  const [hasRecordingConsent, setHasRecordingConsent] = useState<boolean>(false);
  const [recordingConsentAt, setRecordingConsentAt] = useState<string | null>(null);

  // Demo Signup state
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [trialSignupCompleted, setTrialSignupCompleted] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");

  // Live Conversation Transcript & Timer
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // References to active pipeline & live client
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const pipelineRef = useRef<AudioRecordingPipeline | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const callStartTimeRef = useRef<string | null>(null);

  // Post-call result preview
  const [completedCall, setCompletedCall] = useState<CallRecord | null>(null);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (liveClientRef.current) liveClientRef.current.disconnect();
      if (pipelineRef.current) pipelineRef.current.cleanup();
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Format MM:SS timer
  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  /**
   * Starts Call after Consent Dialog confirmation
   */
  const handleStartCall = async (consentToRecord: boolean) => {
    setIsConsentModalOpen(false);
    setErrorMessage(null);
    setCompletedCall(null);
    setTranscript([]);
    setDurationSeconds(0);
    setTrialSignupCompleted(false);
    setHasRecordingConsent(consentToRecord);
    setRecordingConsentAt(consentToRecord ? new Date().toISOString() : null);

    setCallStatus("connecting");
    setCallActive(true);
    callStartTimeRef.current = new Date().toISOString();

    try {
      // 1. Request microphone access
      let micStream: MediaStream;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        micStreamRef.current = micStream;
      } catch (micErr: unknown) {
        throw new Error(
          `Microphone permission denied or unavailable. Please grant microphone access in Chrome settings: ${(micErr as Error).message}`
        );
      }

      // 2. Fetch short-lived ephemeral token from secure server endpoint
      const tokenRes = await fetch("/api/live-token", { method: "POST" });
      if (!tokenRes.ok) {
        const errJson = await tokenRes.json().catch(() => ({}));
        throw new Error(
          errJson.details ||
            errJson.error ||
            "Unable to generate live session token. Please ensure GEMINI_API_KEY is configured in .env.local."
        );
      }
      const tokenData = await tokenRes.json();
      const ephemeralToken = tokenData.token;
      const liveModel = tokenData.model || "gemini-2.5-flash-native-audio-preview-12-2025";
      const voiceName = tokenData.voiceName || "Puck";

      // 3. Initialize Audio Recording & Mixing Pipeline
      const pipeline = new AudioRecordingPipeline();
      await pipeline.initialize(micStream);
      pipelineRef.current = pipeline;

      // If user consented to recording, start MediaRecorder now
      if (consentToRecord) {
        pipeline.startRecording();
      }

      // 4. Connect to Gemini Live API
      const liveClient = new GeminiLiveClient({
        onStatusChange: (newStatus) => {
          setCallStatus(newStatus);
        },
        onTranscriptMessage: (msg) => {
          setTranscript((prev) => {
            const index = prev.findIndex((m) => m.id === msg.id);
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = msg;
              return updated;
            }
            return [...prev, msg];
          });
        },
        onError: (err) => {
          setErrorMessage(err);
        },
        onClose: () => {
          // If connection closes unexpectedly
          if (callActive && !isFinalizing) {
            handleEndCall();
          }
        },
      });

      liveClientRef.current = liveClient;

      // Connect WebSocket with ephemeral token
      await liveClient.connect(
        ephemeralToken,
        liveModel,
        voiceName,
        language,
        micStream,
        pipeline.getAiInputNode(),
        pipeline.getAudioContext() || undefined
      );

      // 5. Start call duration timer
      timerIntervalRef.current = setInterval(() => {
        setDurationSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error("Call initialization failed:", err);
      setErrorMessage((err as Error).message);
      setCallStatus("error");
      setCallActive(false);
      cleanupMedia();
    }
  };

  /**
   * Ends Call, finalizes recording, analyzes transcript with Gemini, saves to storage
   */
  const handleEndCall = useCallback(async () => {
    if (!callActive) return;
    setIsFinalizing(true);
    setCallStatus("idle");

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const endedAt = new Date().toISOString();
    const finalDuration = durationSeconds;
    const finalTranscript = [...transcript];

    // 1. Disconnect Gemini Live session
    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }

    // 2. Finalize audio recording if consent was given
    let audioBlob: Blob | null = null;
    let recordingMime = "audio/webm";

    if (pipelineRef.current && hasRecordingConsent) {
      try {
        const result = await pipelineRef.current.stopRecording();
        if (result?.blob) {
          audioBlob = result.blob;
          recordingMime = result.mimeType;
        }
      } catch (recErr) {
        console.warn("Error finalizing audio recording:", recErr);
      }
    }

    // 3. Cleanup microphone and pipeline
    cleanupMedia();

    // 4. Analyze call transcript with Gemini Text API for summary & sales status
    let aiSummary: AISummary = {
      summary: "Call concluded.",
      customerRequirements: [],
      painPoints: [],
      objections: [],
      interestLevel: "unknown",
      questionsAsked: [],
      nextSteps: ["Follow up with customer."],
      demoRequested: false,
      trialSignupCompleted: trialSignupCompleted,
      salesStatus: trialSignupCompleted ? "Converted" : "Interested",
      statusReason: "Conversation recorded and processed.",
    };

    try {
      const summaryRes = await fetch("/api/analyze-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: finalTranscript,
          trialSignupCompleted,
          language,
        }),
      });

      if (summaryRes.ok) {
        aiSummary = await summaryRes.json();
      }
    } catch (analysisErr) {
      console.warn("AI post-call analysis error, using default summary:", analysisErr);
    }

    // 5. Construct CallRecord and save via Unified Storage Adapter
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRecord: Omit<CallRecord, "storageProvider"> = {
      id: callId,
      createdAt: callStartTimeRef.current || new Date().toISOString(),
      startedAt: callStartTimeRef.current || new Date().toISOString(),
      endedAt,
      durationSeconds: finalDuration,
      contactName: customerName || undefined,
      contactEmail: customerEmail || undefined,
      language,
      salesStatus: aiSummary.salesStatus,
      statusReason: aiSummary.statusReason,
      summary: aiSummary.summary,
      customerRequirements: aiSummary.customerRequirements || [],
      painPoints: aiSummary.painPoints || [],
      objections: aiSummary.objections || [],
      questionsAsked: aiSummary.questionsAsked || [],
      nextSteps: aiSummary.nextSteps || [],
      demoRequested: aiSummary.demoRequested,
      trialSignupCompleted: trialSignupCompleted || aiSummary.trialSignupCompleted,
      transcript: finalTranscript,
      recordingMimeType: recordingMime,
      recordingConsent: hasRecordingConsent,
      recordingConsentAt: recordingConsentAt || undefined,
    };

    try {
      const saved = await persistCall(newRecord, audioBlob);
      setCompletedCall(saved);
    } catch (persistErr) {
      console.error("Failed to persist call:", persistErr);
    } finally {
      setCallActive(false);
      setIsFinalizing(false);
    }
  }, [
    callActive,
    durationSeconds,
    transcript,
    hasRecordingConsent,
    trialSignupCompleted,
    customerName,
    customerEmail,
    language,
    recordingConsentAt,
  ]);

  const cleanupMedia = () => {
    if (pipelineRef.current) {
      pipelineRef.current.cleanup();
      pipelineRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
  };

  /**
   * Handle free trial demo signup confirmation
   */
  const handleConfirmDemoSignup = (name: string, email: string) => {
    setCustomerName(name);
    setCustomerEmail(email);
    setTrialSignupCompleted(true);

    // If call is still active, add confirmation note into live transcript
    if (callActive) {
      setTranscript((prev) => [
        ...prev,
        {
          id: `system-trial-${Date.now()}`,
          speaker: "customer",
          text: `[Trial Confirmed] ${name} (${email || "no email"}) confirmed free trial signup.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          isFinal: true,
        },
      ]);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Live Voice Agent
            </span>
            <span className="text-xs text-slate-400">Gemini Live Bidirectional Audio</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Real-Time AI Sales Conversation
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Selling <strong>ResumePilot AI</strong> — ATS resume creation, job tailoring, and cover letters.
          </p>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-3">
          {callActive && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{formatTimer(durationSeconds)}</span>
            </div>
          )}

          {/* Quick Demo Signup CTA button */}
          <button
            type="button"
            id="trigger-demo-signup-btn"
            onClick={() => setIsDemoModalOpen(true)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              trialSignupCompleted
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20"
            }`}
          >
            {trialSignupCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Trial Activated (Converted)</span>
              </>
            ) : (
              <>
                <Gift className="w-4 h-4" />
                <span>Complete Demo Signup</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error message alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <strong className="font-semibold text-rose-200">Connection Error:</strong>
            <p className="text-rose-300/90 leading-relaxed">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Two Column Layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL: 5 cols on lg */}
        <div className="lg:col-span-5 space-y-6">
          {/* Voice Agent Control Card */}
          <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-5">
            {/* Identity & Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                    <Bot className="w-6 h-6" />
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                      callActive ? "bg-emerald-400" : "bg-slate-500"
                    }`}
                  />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Alex</h2>
                  <p className="text-xs text-slate-400">AI Sales Advisor • ResumePilot</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    callStatus === "speaking"
                      ? "bg-violet-500/20 text-violet-400 border-violet-500/30 animate-pulse"
                      : callStatus === "listening"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : callStatus === "connecting"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      callStatus === "speaking"
                        ? "bg-violet-400 animate-ping"
                        : callStatus === "listening"
                        ? "bg-emerald-400"
                        : callStatus === "connecting"
                        ? "bg-amber-400"
                        : "bg-slate-500"
                    }`}
                  />
                  <span className="capitalize">{callStatus}</span>
                </span>
              </div>
            </div>

            {/* Audio Waveform Visualizer */}
            <AudioVisualizer
              status={callStatus}
              getMicLevel={() => pipelineRef.current?.getMicLevel() || 0}
              getAiLevel={() => pipelineRef.current?.getAiLevel() || 0}
            />

            {/* Language Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Spoken Language
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "en", label: "English", sub: "Default" },
                  { id: "hi", label: "Hindi", sub: "हिंदी" },
                  { id: "mr", label: "Marathi", sub: "मराठी" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={callActive}
                    onClick={() => setLanguage(item.id as Language)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      language === item.id
                        ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm shadow-indigo-500/20"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    } ${callActive ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[10px] text-slate-400">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recording Consent Status Pill */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {hasRecordingConsent ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="text-slate-300">
                  Recording Consent:{" "}
                  <strong className={hasRecordingConsent ? "text-emerald-400" : "text-slate-400"}>
                    {hasRecordingConsent ? "Granted" : "Not Enabled"}
                  </strong>
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                {callActive ? (hasRecordingConsent ? "Recording Dual-Audio" : "Audio Not Saved") : "Configured per call"}
              </span>
            </div>

            {/* Main Call Action Buttons */}
            <div className="pt-2">
              {!callActive ? (
                <button
                  type="button"
                  id="agent-start-call-btn"
                  onClick={() => setIsConsentModalOpen(true)}
                  disabled={isFinalizing}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2.5 transition-transform active:scale-98"
                >
                  <Mic className="w-5 h-5 animate-pulse" />
                  <span>Start Voice Call</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="agent-end-call-btn"
                  onClick={handleEndCall}
                  disabled={isFinalizing}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-bold text-sm shadow-xl shadow-rose-600/25 flex items-center justify-center gap-2.5 transition-transform active:scale-98"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span>{isFinalizing ? "Finalizing Call & Summary..." : "End Call & Generate Summary"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Product Quick Pitch Guide Card */}
          <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>What Alex is selling on this call:</span>
            </div>
            <ul className="text-slate-300 space-y-1.5 pl-4 list-disc text-[11px] leading-relaxed">
              <li>
                <strong>Free Plan (₹0):</strong> 1 complete ATS-optimized resume, core improvements, PDF export.
              </li>
              <li>
                <strong>Pro Plan (₹199/mo):</strong> Unlimited resumes, 1-click job tailoring, AI cover letters.
              </li>
              <li>
                <strong>Target audience:</strong> Freshers, students, career switchers, active job hunters.
              </li>
            </ul>
          </div>
        </div>

        {/* RIGHT PANEL: 7 cols on lg */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {/* Live Transcript Card */}
          <div className="glass-card rounded-2xl border border-slate-800 flex-1 flex flex-col min-h-[460px] p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Live Conversation Transcript
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono">
                  {transcript.length} messages
                </span>
                {callActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
            </div>

            {/* Transcript Messages Container */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
              {transcript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                    <Mic className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-300">
                    {callActive ? "Waiting for initial speech..." : "Transcript is ready"}
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    {callActive
                      ? "Say hello or listen as Alex greets you in " +
                        (language === "hi" ? "Hindi" : language === "mr" ? "Marathi" : "English") +
                        "."
                      : "Start a call to see live speaker-tagged conversation events stream here in real time."}
                  </p>
                </div>
              ) : (
                transcript.map((msg, idx) => {
                  const isAi = msg.speaker === "ai";
                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex items-start gap-3 text-xs ${
                        isAi ? "justify-start" : "justify-start"
                      } animate-in fade-in duration-150`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isAi
                            ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                            : "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              isAi ? "text-indigo-300" : "text-emerald-300"
                            }`}
                          >
                            {isAi ? "Alex (Sales Rep)" : "Customer (You)"}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {msg.timestamp || "00:00"}
                          </span>
                          {!msg.isFinal && (
                            <span className="text-[9px] text-slate-400 italic">speaking...</span>
                          )}
                        </div>
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isAi
                              ? "bg-slate-900/90 text-slate-100 border border-slate-800 rounded-tl-sm"
                              : "bg-indigo-950/30 text-indigo-100 border border-indigo-900/40 rounded-tl-sm"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* In-call listening/speaking indicator bar */}
            {callActive && (
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      callStatus === "speaking"
                        ? "bg-violet-400 animate-pulse"
                        : callStatus === "listening"
                        ? "bg-emerald-400 animate-pulse"
                        : "bg-slate-500"
                    }`}
                  />
                  <span>
                    {callStatus === "speaking"
                      ? "Alex is speaking..."
                      : callStatus === "listening"
                      ? "Listening to your microphone..."
                      : "Connected to Gemini Live"}
                  </span>
                </div>
                <span className="font-mono text-slate-400">
                  {language.toUpperCase()} • 16kHz PCM
                </span>
              </div>
            )}
          </div>

          {/* Post-Call Summary Banner (Appears immediately after call concludes) */}
          {completedCall && (
            <div className="glass-card rounded-2xl border border-indigo-500/40 p-6 space-y-4 animate-in slide-in-from-bottom-3 duration-300">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Call Completed & Processed</h3>
                    <p className="text-[11px] text-slate-400">
                      Duration: {formatTimer(completedCall.durationSeconds)} • Stored in{" "}
                      {completedCall.storageProvider === "supabase" ? "Supabase Cloud" : "Local IndexedDB"}
                    </p>
                  </div>
                </div>

                {/* Sales Status Badge */}
                {(() => {
                  const badge = getStatusBadge(completedCall.salesStatus);
                  return (
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                      <span>{badge.label}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Status Reason */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
                <span className="text-amber-300 font-semibold">Reasoning: </span>
                {completedCall.statusReason}
              </div>

              {/* Summary */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {completedCall.summary}
              </p>

              {/* Playback player if recording exists */}
              {completedCall.recordingConsent && completedCall.recordingUrl && (
                <AudioPlayer
                  src={completedCall.recordingUrl}
                  durationSeconds={completedCall.durationSeconds}
                  recordingConsent={completedCall.recordingConsent}
                  mimeType={completedCall.recordingMimeType}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Consent Modal Dialog before starting */}
      <ConsentDialog
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        onConfirm={handleStartCall}
      />

      {/* Free Trial Demo Signup Modal */}
      <DemoSignupModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onConfirm={handleConfirmDemoSignup}
        initialName={customerName}
        initialEmail={customerEmail}
      />
    </div>
  );
}
