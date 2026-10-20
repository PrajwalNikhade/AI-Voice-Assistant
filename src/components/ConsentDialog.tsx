"use client";

import { useState } from "react";
import { Mic, ShieldCheck, AlertCircle, Sparkles, X } from "lucide-react";

interface ConsentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (recordingConsent: boolean) => void;
}

export default function ConsentDialog({
  isOpen,
  onClose,
  onConfirm,
}: ConsentDialogProps) {
  // Initially unchecked as required by compliance & prompt specification
  const [recordingConsent, setRecordingConsent] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 text-slate-100 space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Mic className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Start Voice Conversation
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Demo
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Please review the audio & data processing disclosures below.
            </p>
          </div>
        </div>

        {/* Disclosure Points */}
        <div className="space-y-3 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-slate-300">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Microphone Access:</strong>
              <p className="text-slate-400 mt-0.5">
                Your browser will request permission to access your microphone for this interactive sales call.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Gemini Live AI Processing:</strong>
              <p className="text-slate-400 mt-0.5">
                Audio is securely streamed to Google Gemini Live API in real-time using short-lived ephemeral credentials.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Call History & Summary:</strong>
              <p className="text-slate-400 mt-0.5">
                The conversation transcript and an AI-generated sales summary will be saved to your local or cloud call history.
              </p>
            </div>
          </div>
        </div>

        {/* Affirmative Recording Consent Checkbox */}
        <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="recording-consent-checkbox"
              checked={recordingConsent}
              onChange={(e) => setRecordingConsent(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-semibold text-white">
                Save audio recording for demonstration & playback (Optional)
              </span>
              <p className="text-slate-400 mt-1 leading-relaxed">
                If checked, both your microphone audio and the AI speech will be mixed and recorded. You can listen to or download it later. If unchecked, the voice call will proceed normally without saving any audio file.
              </p>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            id="confirm-start-call-button"
            onClick={() => onConfirm(recordingConsent)}
            className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
          >
            <Mic className="w-4 h-4" />
            Connect & Start Voice Call
          </button>
        </div>
      </div>
    </div>
  );
}
