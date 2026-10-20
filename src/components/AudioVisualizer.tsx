"use client";

import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  status: "idle" | "connecting" | "connected" | "listening" | "speaking" | "error";
  getMicLevel?: () => number;
  getAiLevel?: () => number;
}

export default function AudioVisualizer({
  status,
  getMicLevel,
  getAiLevel,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Query real audio levels
      const micLvl = getMicLevel ? getMicLevel() : 0;
      const aiLvl = getAiLevel ? getAiLevel() : 0;
      const activeLvl = status === "speaking" ? aiLvl : status === "listening" ? micLvl : 0;

      // Color scheme based on state
      let strokeGradient = ctx.createLinearGradient(0, 0, width, 0);
      let glowColor = "rgba(99, 102, 241, 0.5)";

      if (status === "speaking") {
        // AI Speaking: Vibrant Indigo / Violet / Cyan
        strokeGradient.addColorStop(0, "#6366f1");
        strokeGradient.addColorStop(0.5, "#a855f7");
        strokeGradient.addColorStop(1, "#38bdf8");
        glowColor = "rgba(168, 85, 247, 0.6)";
      } else if (status === "listening") {
        // Customer Speaking / Listening: Vibrant Emerald / Cyan
        strokeGradient.addColorStop(0, "#10b981");
        strokeGradient.addColorStop(0.5, "#06b6d4");
        strokeGradient.addColorStop(1, "#3b82f6");
        glowColor = "rgba(16, 185, 129, 0.6)";
      } else if (status === "connecting") {
        strokeGradient.addColorStop(0, "#f59e0b");
        strokeGradient.addColorStop(1, "#f97316");
        glowColor = "rgba(245, 158, 11, 0.5)";
      } else {
        // Idle
        strokeGradient.addColorStop(0, "#475569");
        strokeGradient.addColorStop(1, "#64748b");
        glowColor = "rgba(71, 85, 105, 0.2)";
      }

      const numBars = 36;
      const barWidth = 4;
      const gap = (width - numBars * barWidth) / (numBars - 1);
      const centerY = height / 2;

      phase += 0.08;

      ctx.save();
      ctx.shadowBlur = activeLvl > 0.05 ? 12 : 2;
      ctx.shadowColor = glowColor;

      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + gap);
        // Center weight: bars in center are naturally higher
        const distFromCenter = Math.abs(i - numBars / 2) / (numBars / 2);
        const centerFactor = 1 - distFromCenter * 0.4;

        let barHeight = 4; // base resting height

        if (status === "speaking" || status === "listening") {
          // If real audio level is present, animate dynamically
          const wave = Math.sin(phase + i * 0.35) * 0.5 + 0.5;
          const dynamicBoost = activeLvl * 65 * centerFactor;
          barHeight = Math.max(4, 4 + wave * 6 + dynamicBoost);
        } else if (status === "connecting") {
          const wave = Math.sin(phase * 1.5 + i * 0.5) * 0.5 + 0.5;
          barHeight = 4 + wave * 14;
        }

        const topY = centerY - barHeight / 2;

        ctx.fillStyle = strokeGradient;
        ctx.beginPath();
        ctx.roundRect(x, topY, barWidth, barHeight, 3);
        ctx.fill();
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [status, getMicLevel, getAiLevel]);

  return (
    <div className="w-full flex flex-col items-center justify-center py-4">
      <div className="relative w-full max-w-md h-24 flex items-center justify-center px-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-inner">
        <canvas
          ref={canvasRef}
          width={400}
          height={80}
          className="w-full h-full"
        />
        {/* Status overlay badge */}
        <div className="absolute bottom-2 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-800 text-[10px]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status === "speaking"
                ? "bg-violet-400 animate-ping"
                : status === "listening"
                ? "bg-emerald-400 animate-pulse"
                : status === "connecting"
                ? "bg-amber-400 animate-pulse"
                : "bg-slate-500"
            }`}
          />
          <span className="capitalize font-mono text-slate-300">{status}</span>
        </div>
      </div>
    </div>
  );
}
