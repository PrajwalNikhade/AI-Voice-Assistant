"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PhoneCall,
  UserCheck,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  Database,
  Calendar,
  Volume2,
  Mic,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { CallRecord, SalesStatus } from "@/types";
import { fetchAllCalls, checkServerStorageStatus } from "@/lib/storage-adapter";
import CallDetailsModal, { getStatusBadge } from "@/components/CallDetailsModal";

export default function DashboardPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [storageInfo, setStorageInfo] = useState<{
    supabaseConfigured: boolean;
    geminiKeyConfigured: boolean;
  }>({ supabaseConfigured: false, geminiKeyConfigured: false });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [loadedCalls, status] = await Promise.all([
          fetchAllCalls(),
          checkServerStorageStatus(),
        ]);
        setCalls(loadedCalls);
        setStorageInfo(status);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute real metrics from saved call records
  const totalCalls = calls.length;
  const convertedCalls = calls.filter((c) => c.salesStatus === "Converted").length;
  const interestedCalls = calls.filter((c) => c.salesStatus === "Interested").length;
  const followUpCalls = calls.filter((c) => c.salesStatus === "Follow-up Required").length;
  const demoRequestedCalls = calls.filter((c) => c.salesStatus === "Demo Requested").length;
  const notInterestedCalls = calls.filter((c) => c.salesStatus === "Not Interested").length;
  const noResponseCalls = calls.filter((c) => c.salesStatus === "No Response").length;

  const conversionRate = totalCalls > 0 ? Math.round((convertedCalls / totalCalls) * 100) : 0;

  const statusDistribution: { status: SalesStatus; count: number; color: string }[] = [
    { status: "Converted", count: convertedCalls, color: "bg-emerald-500" },
    { status: "Interested", count: interestedCalls, color: "bg-blue-500" },
    { status: "Follow-up Required", count: followUpCalls, color: "bg-amber-500" },
    { status: "Demo Requested", count: demoRequestedCalls, color: "bg-purple-500" },
    { status: "Not Interested", count: notInterestedCalls, color: "bg-rose-500" },
    { status: "No Response", count: noResponseCalls, color: "bg-slate-500" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              Sales Workspace
            </span>
            <span className="text-xs text-slate-400">ResumePilot AI Campaign</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Sales Performance Dashboard
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Real-time insights and call history conducted by AI sales rep Alex.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/agent"
            id="dashboard-start-call-btn"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-transform active:scale-95"
          >
            <Mic className="w-4 h-4 animate-pulse" />
            <span>Start New Voice Call</span>
          </Link>
        </div>
      </div>

      {/* Storage & Environment Notice if Supabase or Gemini is not yet configured */}
      {!storageInfo.geminiKeyConfigured && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs text-amber-300">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-semibold text-amber-200">
              Gemini API Key Required for Live AI Conversation:
            </strong>
            <p className="text-amber-300/90 leading-relaxed">
              Add your <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-200">GEMINI_API_KEY</code> into <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-200">.env.local</code> to connect with Google Gemini Live API.
            </p>
          </div>
        </div>
      )}

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Calls */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Calls</span>
            <PhoneCall className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalCalls}</div>
          <p className="text-[10px] text-slate-400">All recorded sessions</p>
        </div>

        {/* Converted Calls */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2 bg-emerald-950/10">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Converted</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-300">{convertedCalls}</div>
          <p className="text-[10px] text-emerald-400/80">Completed demo signups</p>
        </div>

        {/* Conversion Rate */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2 bg-indigo-950/10">
          <div className="flex items-center justify-between text-indigo-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Conversion</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-indigo-300">{conversionRate}%</div>
          <p className="text-[10px] text-indigo-400/80">Free trial signup rate</p>
        </div>

        {/* Interested Leads */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Interested</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-blue-300">{interestedCalls}</div>
          <p className="text-[10px] text-slate-400">High buying interest</p>
        </div>

        {/* Follow-up Required */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Follow-up</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-300">{followUpCalls}</div>
          <p className="text-[10px] text-slate-400">Requires next contact</p>
        </div>

        {/* Demo Requests */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Demo Req.</span>
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-purple-300">{demoRequestedCalls}</div>
          <p className="text-[10px] text-slate-400">Product walkthrough</p>
        </div>
      </div>

      {/* Middle section: Sales Status Distribution & Quick Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Sales Pipeline Status Distribution
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated from actual conversation classifications.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total: {totalCalls}
            </span>
          </div>

          {/* Progress bar visual */}
          <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
            {totalCalls === 0 ? (
              <div className="w-full bg-slate-800" />
            ) : (
              statusDistribution.map((item) => {
                const pct = (item.count / totalCalls) * 100;
                if (pct === 0) return null;
                return (
                  <div
                    key={item.status}
                    style={{ width: `${pct}%` }}
                    className={`${item.color} h-full transition-all duration-500`}
                    title={`${item.status}: ${item.count} (${Math.round(pct)}%)`}
                  />
                );
              })
            )}
          </div>

          {/* Status Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {statusDistribution.map((item) => {
              const pct = totalCalls > 0 ? Math.round((item.count / totalCalls) * 100) : 0;
              return (
                <div
                  key={item.status}
                  className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-xs text-slate-300 font-medium">{item.status}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-white">{item.count}</span>
                    <span className="text-[10px] text-slate-400 ml-1">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Product Campaign Summary Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                Active Campaign
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Fictional SaaS
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              ResumePilot AI
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              &quot;Your AI-powered partner for landing your next job.&quot; Alex calls prospective customers, demonstrates ATS features, and secures Free Plan signups.
            </p>

            <div className="pt-2 border-t border-slate-800/80 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Free Plan:</span>
                <span className="text-emerald-400 font-semibold">₹0 (1 Resume, ATS Core)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Pro Plan:</span>
                <span className="text-indigo-300 font-semibold">₹199 / month</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <Link
              href="/settings"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 group"
            >
              <span>View Product Features & Prompt Guidelines</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Calls Table */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Recent Conversations
            </h2>
            <p className="text-xs text-slate-400">
              Latest calls conducted by the sales assistant.
            </p>
          </div>
          <Link
            href="/history"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 group"
          >
            <span>View All History</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Loading conversations...
          </div>
        ) : calls.length === 0 ? (
          /* Genuine Empty State */
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <PhoneCall className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">No calls completed yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Ready to test the live voice sales bot? Start a voice conversation to sell ResumePilot AI and see metrics appear in real time.
            </p>
            <div className="pt-2">
              <Link
                href="/agent"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-transform active:scale-95"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Start First Voice Call</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Language</th>
                  <th className="py-3 px-3">Sales Status</th>
                  <th className="py-3 px-3">AI Summary</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {calls.slice(0, 5).map((call) => {
                  const statusStyle = getStatusBadge(call.salesStatus);
                  const mins = Math.floor(call.durationSeconds / 60);
                  const secs = call.durationSeconds % 60;
                  return (
                    <tr
                      key={call.id}
                      onClick={() => setSelectedCall(call)}
                      className="hover:bg-slate-900/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-3 text-slate-300 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(call.createdAt).toLocaleDateString()}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(call.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-white font-medium">
                        {call.contactName || "Anonymous Prospect"}
                        {call.contactEmail && (
                          <div className="text-[10px] text-slate-400">{call.contactEmail}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-300 font-mono">
                        {mins}m {secs}s
                      </td>
                      <td className="py-3.5 px-3 uppercase font-mono text-slate-400">
                        {call.language === "hi" ? "Hindi" : call.language === "mr" ? "Marathi" : "English"}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium border text-[11px] ${statusStyle.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-300 max-w-xs truncate">
                        {call.summary || "Conversation completed."}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCall(call);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Call Details Modal */}
      <CallDetailsModal call={selectedCall} onClose={() => setSelectedCall(null)} />
    </div>
  );
}
