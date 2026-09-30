"use client";

import { useEffect, useState } from "react";
import { getProgress, type ProgressData } from "@/lib/progress";

export default function ProgressCard() {
  const [p, setP] = useState<ProgressData | null>(null);

  useEffect(() => {
    setP(getProgress());
  }, []);

  if (!p || p.sessions === 0) {
    return (
      <div className="glass rounded-2xl p-5 text-center w-full max-w-3xl mt-10">
        <p className="text-sm opacity-70">📊 Finish your first session and your stats will appear here — sessions, streak, and words learned.</p>
      </div>
    );
  }

  const stats = [
    { label: "Sessions", value: p.sessions, icon: "🗣️" },
    { label: "Practice minutes", value: p.minutes, icon: "⏱️" },
    { label: "Day streak", value: `${p.streak}🔥`, icon: "" },
    { label: "Words learned", value: p.wordsLearned, icon: "📚" },
    { label: "Level", value: p.lastLevel, icon: "📈" },
  ];

  return (
    <div className="glass rounded-2xl p-5 w-full max-w-3xl mt-10">
      <div className="text-xs font-bold tracking-widest opacity-60 mb-3 text-center">YOUR PROGRESS 📊</div>
      <div className="flex justify-between gap-2 flex-wrap">
        {stats.map((s) => (
          <div key={s.label} className="text-center flex-1 min-w-[80px]">
            <div className="text-xl font-extrabold text-amber-300">{s.icon}{s.value}</div>
            <div className="text-[11px] opacity-60">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
