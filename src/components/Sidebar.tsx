"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Mic,
  History,
  Settings,
  Sparkles,
  Database,
  Radio,
  FileCheck2,
} from "lucide-react";
import { SystemStatus } from "@/types";

export default function Sidebar() {
  const pathname = usePathname();
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStatus(data);
      })
      .catch(() => {});
  }, []);

  const navItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: "Live Voice Agent",
      href: "/agent",
      icon: Mic,
      badge: "LIVE",
    },
    {
      name: "Call History",
      href: "/history",
      icon: History,
      badge: null,
    },
    {
      name: "Product & Settings",
      href: "/settings",
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/70 backdrop-blur-xl flex flex-col h-screen sticky top-0 shrink-0 z-40 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-white tracking-tight">VoicePilot</span>
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                AI
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Sales Assistant
            </p>
          </div>
        </Link>
        <div className="mt-4 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
          <FileCheck2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate">Selling: <strong className="text-indigo-300">ResumePilot AI</strong></span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-300"
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* System Status Indicators in Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-xs space-y-2">
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          System Connectivity
        </div>

        {/* Gemini status */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                status?.hasGeminiKey ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-amber-400"
              }`}
            />
            <span className="text-slate-300 text-[11px]">Gemini Live AI</span>
          </div>
          <span
            className={`text-[10px] font-medium ${
              status?.hasGeminiKey ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {status?.hasGeminiKey ? "Configured" : "Key Needed"}
          </span>
        </div>

        {/* Storage status */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3 text-slate-400" />
            <span className="text-slate-300 text-[11px]">Storage Engine</span>
          </div>
          <span
            className={`text-[10px] font-medium ${
              status?.hasSupabase ? "text-indigo-400" : "text-slate-400"
            }`}
          >
            {status?.hasSupabase ? "Supabase Cloud" : "IndexedDB Local"}
          </span>
        </div>
      </div>
    </aside>
  );
}
