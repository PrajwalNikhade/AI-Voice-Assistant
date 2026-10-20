"use client";

import { useEffect, useState } from "react";
import {
  History,
  Search,
  Calendar,
  Clock,
  Globe,
  Volume2,
  FileText,
  Filter,
  Trash2,
  Database,
  ExternalLink,
} from "lucide-react";
import { CallRecord, SalesStatus } from "@/types";
import { fetchAllCalls, deleteCallRecord } from "@/lib/storage-adapter";
import CallDetailsModal, { getStatusBadge } from "@/components/CallDetailsModal";

const STATUS_FILTERS: Array<SalesStatus | "All Calls"> = [
  "All Calls",
  "Converted",
  "Interested",
  "Follow-up Required",
  "Not Interested",
  "Demo Requested",
  "No Response",
];

export default function CallHistoryPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SalesStatus | "All Calls">("All Calls");
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  const loadCalls = async () => {
    setLoading(true);
    try {
      const records = await fetchAllCalls();
      setCalls(records);
    } catch (err) {
      console.error("Failed to load call history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this call record?")) return;
    await deleteCallRecord(id);
    setCalls((prev) => prev.filter((c) => c.id !== id));
    if (selectedCall?.id === id) setSelectedCall(null);
  };

  const filteredCalls = calls.filter((c) => {
    // Status filter
    if (statusFilter !== "All Calls" && c.salesStatus !== statusFilter) {
      return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = c.contactName?.toLowerCase().includes(query);
      const matchEmail = c.contactEmail?.toLowerCase().includes(query);
      const matchSummary = c.summary?.toLowerCase().includes(query);
      const matchReason = c.statusReason?.toLowerCase().includes(query);
      const matchTranscript = c.transcript?.some((t) =>
        t.text.toLowerCase().includes(query)
      );
      return matchName || matchEmail || matchSummary || matchReason || matchTranscript;
    }

    return true;
  });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              Audit & Analytics
            </span>
            <span className="text-xs text-slate-400">Persistent Records</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Call History & Recordings
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Review past voice conversations, transcripts, recordings, and sales status classifications.
          </p>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          <span>Total Saved: <strong className="text-white">{calls.length}</strong></span>
        </div>
      </div>

      {/* Search and Status Filters */}
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, email, keywords, or summary..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {STATUS_FILTERS.map((status) => {
            const isSelected = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Call History List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
          Loading call records...
        </div>
      ) : filteredCalls.length === 0 ? (
        /* Empty State */
        <div className="glass-card rounded-2xl border border-slate-800 p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-300">
            {searchQuery || statusFilter !== "All Calls"
              ? "No calls match your search or filter"
              : "No call records found"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== "All Calls"
              ? "Try resetting the status filter or clearing your search term."
              : "Start a call with the AI Voice Agent to conduct a live sales conversation and save records here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCalls.map((call) => {
            const statusStyle = getStatusBadge(call.salesStatus);
            return (
              <div
                key={call.id}
                onClick={() => setSelectedCall(call)}
                className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-800/80 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
              >
                {/* Left meta info */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-sm text-white">
                      {call.contactName || "Anonymous Prospect"}
                    </span>
                    {call.contactEmail && (
                      <span className="text-xs text-slate-400">({call.contactEmail})</span>
                    )}
                    {/* Status badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusStyle.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                      <span>{statusStyle.label}</span>
                    </div>

                    {/* Storage indicator */}
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Database className="w-3 h-3 text-indigo-400" />
                      {call.storageProvider === "supabase" ? "Supabase Cloud" : "IndexedDB Local"}
                    </span>
                  </div>

                  {/* Summary snippet */}
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {call.summary || "Conversation recorded and saved."}
                  </p>

                  {/* Metadata tags */}
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(call.createdAt).toLocaleDateString()}{" "}
                      {new Date(call.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {formatDuration(call.durationSeconds)}
                    </span>
                    <span className="flex items-center gap-1 uppercase font-mono">
                      <Globe className="w-3.5 h-3.5 text-slate-500" />
                      {call.language === "hi" ? "Hindi" : call.language === "mr" ? "Marathi" : "English"}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      {call.transcript?.length || 0} messages
                    </span>
                    {call.recordingConsent && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Volume2 className="w-3.5 h-3.5" />
                        Audio Saved
                      </span>
                    )}
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCall(call);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <span>View Details</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, call.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete call"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Call Details Modal */}
      <CallDetailsModal call={selectedCall} onClose={() => setSelectedCall(null)} />
    </div>
  );
}
