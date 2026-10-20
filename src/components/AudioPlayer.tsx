"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Download, Volume2, ShieldCheck, ShieldAlert } from "lucide-react";

interface AudioPlayerProps {
  src?: string;
  durationSeconds?: number;
  recordingConsent?: boolean;
  mimeType?: string;
}

export default function AudioPlayer({
  src,
  durationSeconds = 0,
  recordingConsent = false,
  mimeType = "audio/webm",
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn("Audio playback failed:", err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!src) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          {recordingConsent
            ? "Audio recording was not captured or is processing."
            : "No recording available: Customer did not consent to call recording."}
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Header bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-200">Call Audio Recording</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Recorded with Consent</span>
        </div>
      </div>

      {/* Player Controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-indigo-600/30 shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Progress Slider */}
        <div className="flex-1 space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Download Button */}
        <a
          href={src}
          download={`call_recording.${mimeType.includes("mp4") ? "mp4" : "webm"}`}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Download audio recording"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
