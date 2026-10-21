"use client";

import { useState } from "react";
import { speakSmart } from "@/lib/speech";

/** 🔊 button for public SEO pages — speaks German text via the free browser voice */
export default function SpeakButton({ text, className }: { text: string; className?: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      onClick={() => {
        if (playing) return;
        setPlaying(true);
        speakSmart(text, "de-DE", { rate: 0.85, onEnd: () => setPlaying(false) });
      }}
      disabled={playing}
      className={`glass rounded-full px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50 ${className ?? ""}`}
      aria-label="Hear the German pronunciation"
    >
      {playing ? "🔊 …" : "🔊 Anhören"}
    </button>
  );
}
