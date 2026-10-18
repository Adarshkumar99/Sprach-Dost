"use client";

import { useEffect, useState } from "react";
import { getWeekly, GOALS, weeklySummary, type WeeklyData } from "@/lib/weekly";

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full transition-all bg-gradient-to-r from-emerald-400 to-amber-400"
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

export default function WeeklyChallenges() {
  const [week, setWeek] = useState<WeeklyData | null>(null);

  useEffect(() => {
    queueMicrotask(() => setWeek(getWeekly()));
    const t = setInterval(() => setWeek(getWeekly()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!week) return null;
  const { done, total } = weeklySummary(week);

  return (
    <div className="glass rounded-3xl p-6 w-full max-w-4xl mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-bold text-lg">🏆 This Week</div>
          <div className="text-xs opacity-60">Resets Monday • synced to cloud if logged in</div>
        </div>
        <div className="text-sm font-extrabold text-amber-300">
          {done}/{total} done
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {GOALS.map((g) => {
          const cur = week[g.key as keyof WeeklyData] as number;
          const pct = Math.round((cur / g.target) * 100);
          return (
            <div key={g.key} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xl">{g.icon}</div>
                <div className="text-xs font-bold opacity-70">{cur}/{g.target}</div>
              </div>
              <div className="text-sm font-semibold mb-2">{g.label}</div>
              <Bar pct={pct} />
              {cur >= g.target && (
                <div className="text-xs text-emerald-300 mt-2">Goal unlocked 🎉</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
