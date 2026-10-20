"use client";

import { CallRecord, SalesStatus } from "@/types";
import {
  X,
  Clock,
  Globe,
  Calendar,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Database,
  User,
  Bot,
  Copy,
  Check,
} from "lucide-react";
import AudioPlayer from "./AudioPlayer";
import { useState } from "react";

interface CallDetailsModalProps {
  call: CallRecord | null;
  onClose: () => void;
}

export function getStatusBadge(status: SalesStatus) {
  switch (status) {
    case "Converted":
      return {
        bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        label: "Converted",
        dot: "bg-emerald-400",
      };
    case "Interested":
      return {
        bg: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        label: "Interested",
        dot: "bg-blue-400",
      };
    case "Follow-up Required":
      return {
        bg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        label: "Follow-up Required",
        dot: "bg-amber-400",
      };
    case "Not Interested":
      return {
        bg: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        label: "Not Interested",
        dot: "bg-rose-400",
      };
    case "Demo Requested":
      return {
        bg: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        label: "Demo Requested",
        dot: "bg-purple-400",
      };
    case "No Response":
    default:
      return {
        bg: "bg-slate-500/15 text-slate-400 border-slate-500/30",
        label: "No Response",
        dot: "bg-slate-400",
      };
  }
}

export default function CallDetailsModal({ call, onClose }: CallDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!call) return null;

  const statusStyle = getStatusBadge(call.salesStatus);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const copyTranscript = () => {
    const text = (call.transcript || [])
      .map((t) => `[${t.timestamp || "00:00"}] ${t.speaker === "ai" ? "AI Sales Rep" : "Customer"}: ${t.text}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/60 shrink-0">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Call Details & Analysis
              </h2>
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusStyle.bg}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
                <span>{statusStyle.label}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(call.createdAt).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(call.durationSeconds)}
              </span>
              <span className="flex items-center gap-1 uppercase font-mono">
                <Globe className="w-3.5 h-3.5" />
                {call.language === "hi" ? "Hindi" : call.language === "mr" ? "Marathi" : "English"}
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                {call.storageProvider === "supabase" ? "Supabase Cloud" : "Local IndexedDB"}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Customer Metadata Card (if provided) */}
          {(call.contactName || call.contactEmail) && (
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 font-medium">Customer: </span>
                <span className="text-white font-semibold">{call.contactName || "Anonymous"}</span>
                {call.contactEmail && (
                  <span className="text-slate-400 ml-2">({call.contactEmail})</span>
                )}
              </div>
              {call.trialSignupCompleted && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Demo Free Trial Signed Up
                </span>
              )}
            </div>
          )}

          {/* Audio Recording Player */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Call Audio Recording
            </h3>
            <AudioPlayer
              src={call.recordingUrl}
              durationSeconds={call.durationSeconds}
              recordingConsent={call.recordingConsent}
              mimeType={call.recordingMimeType}
            />
          </div>

          {/* AI Sales Summary & Reasoning */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Summary */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                <Sparkles className="w-4 h-4" />
                <span>AI Call Summary</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {call.summary || "No summary generated."}
              </p>
            </div>

            {/* Sales Status Reasoning */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <HelpCircle className="w-4 h-4" />
                <span>Status Classification Reason</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {call.statusReason || "Classification assigned based on customer engagement signals."}
              </p>
            </div>
          </div>

          {/* Requirements, Pain points, Objections, Next steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Requirements */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span>Customer Requirements</span>
              </div>
              {call.customerRequirements && call.customerRequirements.length > 0 ? (
                <ul className="text-xs text-slate-300 space-y-1.5 pl-4 list-disc">
                  {call.customerRequirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No explicit requirements captured.</p>
              )}
            </div>

            {/* Pain Points */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Pain Points & Objections</span>
              </div>
              {call.painPoints && call.painPoints.length > 0 ? (
                <ul className="text-xs text-slate-300 space-y-1.5 pl-4 list-disc">
                  {call.painPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                  {call.objections?.map((obj, i) => (
                    <li key={`obj-${i}`} className="text-amber-300">
                      Objection: {obj}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No specific objections recorded.</p>
              )}
            </div>
          </div>

          {/* Next Steps */}
          {call.nextSteps && call.nextSteps.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                <ArrowRight className="w-4 h-4" />
                <span>Proposed Next Steps</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc">
                {call.nextSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Full Live Transcript */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Full Conversation Transcript ({call.transcript?.length || 0} messages)
              </h3>
              <button
                type="button"
                onClick={copyTranscript}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy Transcript"}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 max-h-72 overflow-y-auto space-y-3">
              {call.transcript && call.transcript.length > 0 ? (
                call.transcript.map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className={`flex items-start gap-3 text-xs ${
                      msg.speaker === "ai" ? "pl-2" : "pl-2"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        msg.speaker === "ai"
                          ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {msg.speaker === "ai" ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            msg.speaker === "ai" ? "text-indigo-300" : "text-emerald-300"
                          }`}
                        >
                          {msg.speaker === "ai" ? "Alex (AI Sales Rep)" : "Customer"}
                        </span>
                        <span className="text-[10px] text-slate-400">{msg.timestamp || "00:00"}</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No transcript recorded for this conversation.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
