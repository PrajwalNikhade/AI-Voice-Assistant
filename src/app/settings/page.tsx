"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Sparkles,
  ShieldAlert,
  Database,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  FileCode,
  Tag,
  Radio,
} from "lucide-react";
import { PRODUCT_CONFIG } from "@/config/product-config";
import { SystemStatus } from "@/types";

export default function SettingsPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStatus(data);
      })
      .catch(() => {});
  }, []);

  const copySqlScript = () => {
    const sql = `-- Supabase calls table setup
CREATE TABLE IF NOT EXISTS public.calls (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  contact_name TEXT,
  contact_email TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  sales_status TEXT NOT NULL,
  status_reason TEXT,
  summary TEXT,
  customer_requirements JSONB DEFAULT '[]'::jsonb,
  pain_points JSONB DEFAULT '[]'::jsonb,
  objections JSONB DEFAULT '[]'::jsonb,
  questions_asked JSONB DEFAULT '[]'::jsonb,
  next_steps JSONB DEFAULT '[]'::jsonb,
  demo_requested BOOLEAN DEFAULT false,
  trial_signup_completed BOOLEAN DEFAULT false,
  transcript JSONB DEFAULT '[]'::jsonb,
  recording_path TEXT,
  recording_mime_type TEXT DEFAULT 'audio/webm',
  recording_consent BOOLEAN DEFAULT false,
  recording_consent_at TIMESTAMPTZ
);`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            System Configuration
          </span>
          <span className="text-xs text-slate-400">Environment & Product Rules</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
          Product & Environment Settings
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Central configuration for ResumePilot AI sales pitch, pricing, and backend connectivity diagnostics.
        </p>
      </div>

      {/* Demonstration Notice Card */}
      <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-800/40 flex items-start gap-3.5">
        <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-slate-300">
          <strong className="text-indigo-200 font-semibold">
            Demonstration Application Disclosure:
          </strong>
          <p className="leading-relaxed">
            {PRODUCT_CONFIG.disclaimer} This application is an interactive demonstration of a real-time AI sales agent powered by Google Gemini Live API. No real money or payment gateway is processed.
          </p>
        </div>
      </div>

      {/* Environment Diagnostics Checklist */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Backend Connectivity Diagnostics
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">Environment Check</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Gemini Live API */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Google Gemini API</span>
              {status?.hasGeminiKey ? (
                <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Key Configured
                </span>
              ) : (
                <span className="flex items-center gap-1 text-rose-400 text-[11px] font-semibold">
                  <XCircle className="w-3.5 h-3.5" />
                  Key Missing
                </span>
              )}
            </div>
            <p className="text-slate-400 text-[11px]">
              Live Model: <code className="text-indigo-300">{status?.geminiLiveModel || "gemini-2.5-flash-native-audio-preview-12-2025"}</code>
              <br />
              Text Model: <code className="text-indigo-300">{status?.geminiTextModel || "gemini-2.5-flash"}</code>
            </p>
          </div>

          {/* Supabase PostgreSQL & Storage */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Supabase Storage & PostgreSQL</span>
              {status?.hasSupabase ? (
                <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 text-[11px] font-semibold">
                  <Database className="w-3.5 h-3.5" />
                  Using Local IndexedDB
                </span>
              )}
            </div>
            <p className="text-slate-400 text-[11px]">
              {status?.hasSupabase
                ? "Calls and audio recordings are synced to your cloud database."
                : "Cloud credentials not provided. Calls and audio recordings are saved locally in browser IndexedDB."}
            </p>
          </div>
        </div>
      </div>

      {/* Product Information Card: ResumePilot AI */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
            Demonstration Product Profile
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            {PRODUCT_CONFIG.name} — Pricing & Features
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tagline: &quot;{PRODUCT_CONFIG.tagline}&quot;
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{PRODUCT_CONFIG.pricing.free.name}</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Core Demo Plan
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">{PRODUCT_CONFIG.pricing.free.price}</span>
              <span className="text-xs text-slate-400">/{PRODUCT_CONFIG.pricing.free.billingPeriod}</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 pl-4 list-disc">
              {PRODUCT_CONFIG.pricing.free.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-indigo-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{PRODUCT_CONFIG.pricing.pro.name}</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Pro Tier
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-indigo-300">{PRODUCT_CONFIG.pricing.pro.price}</span>
              <span className="text-xs text-slate-400">/{PRODUCT_CONFIG.pricing.pro.billingPeriod}</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 pl-4 list-disc">
              {PRODUCT_CONFIG.pricing.pro.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Target Audience */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Target Audience
          </h4>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_CONFIG.targetAudience.map((audience, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300"
              >
                {audience}
              </span>
            ))}
          </div>
        </div>

        {/* Sales Guidelines configured for Alex */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Sales Assistant Guidelines (Configured in product-config.ts)
          </h4>
          <ul className="text-xs text-slate-300 space-y-1.5 pl-5 list-disc leading-relaxed">
            {PRODUCT_CONFIG.salesGuidelines.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Supabase Schema Helper */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Database Migration Helper</h3>
          </div>
          <button
            type="button"
            onClick={copySqlScript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSql ? "Copied SQL" : "Copy SQL Script"}</span>
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Paste into your Supabase SQL Editor (<code className="text-slate-300">supabase/schema.sql</code>) to set up the calls table and storage policies.
        </p>
      </div>
    </div>
  );
}
