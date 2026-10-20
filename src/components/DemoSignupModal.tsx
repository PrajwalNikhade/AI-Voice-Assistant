"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, Sparkles, X, Gift, ShieldAlert } from "lucide-react";
import { PRODUCT_CONFIG } from "@/config/product-config";

interface DemoSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, email: string) => void;
  initialName?: string;
  initialEmail?: string;
}

export default function DemoSignupModal({
  isOpen,
  onClose,
  onConfirm,
  initialName = "",
  initialEmail = "",
}: DemoSignupModalProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide your name to start the free demo trial.");
      return;
    }
    setError("");
    setIsConfirmed(true);

    // Fire confetti for celebration
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    setTimeout(() => {
      onConfirm(name.trim(), email.trim());
      setIsConfirmed(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 text-slate-100 space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isConfirmed ? (
          <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-white">Free Trial Activated!</h3>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              Welcome aboard, <strong>{name}</strong>! Your demo free trial for ResumePilot AI is confirmed. Sales status updated to <span className="text-emerald-400 font-semibold">Converted</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Start Free Trial
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                    ₹0 Free Plan
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  {PRODUCT_CONFIG.name} — {PRODUCT_CONFIG.tagline}
                </p>
              </div>
            </div>

            {/* Plan inclusions */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                What you get in the demo trial:
              </div>
              <ul className="text-slate-400 space-y-1 pl-5 list-disc text-[11px]">
                <li>1 ATS-optimized resume creation</li>
                <li>Instant AI improvement bullet-point suggestions</li>
                <li>Zero payment or credit card required</li>
              </ul>
            </div>

            {/* Form inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Your Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address <span className="text-slate-400">(Optional for demo)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. priya@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                {error}
              </p>
            )}

            {/* Demo notice */}
            <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Demonstration confirmation only. No actual monetary transaction or third-party user account is created.
              </span>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="confirm-demo-signup-button"
                className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm Demo Signup
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
