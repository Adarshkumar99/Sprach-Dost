"use client";

/**
 * Daily Quests card — 3 rotating quests per IST day with progress bars,
 * ✅ on completion and bonus XP (awarded automatically on completion).
 * Polls every 5s so completion reflects right after any practice action.
 */

import { useEffect, useState } from "react";
import { questProgress, type Quest } from "@/lib/quests";

export default function DailyQuests() {
  const [rows, setRows] = useState<{ quest: Quest; done: number; complete: boolean }[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setRows(questProgress().map(({ quest, done, complete }) => ({ quest, done, complete })));
    refresh();
    const iv = setInterval(() => { refresh(); setTick((t) => t + 1); }, 5000);
    return () => clearInterval(iv);
  }, []);

  if (rows.length === 0) return null;
  const doneCount = rows.filter((r) => r.complete).length;

  return (
    <div className="glass rounded-3xl p-6 w-full max-w-3xl mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">🎯 Daily Quests</h3>
        <span className="text-xs opacity-60">{doneCount}/3 done • resets at midnight IST</span>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {rows.map(({ quest, done, complete }) => {
          const pct = Math.min(100, Math.round((done / quest.target) * 100));
          const label = quest.label.replace("{n}", String(quest.target));
          return (
            <div
              key={quest.type}
              className={`rounded-2xl p-4 border transition-all ${
                complete ? "border-emerald-400/50 bg-emerald-400/10" : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-2xl">{quest.icon}</span>
                <span className={`text-xs font-bold ${complete ? "text-emerald-300" : "text-amber-300"}`}>
                  {complete ? "✅ done" : `+${quest.reward} XP`}
                </span>
              </div>
              <div className="text-sm font-semibold leading-snug">{label}</div>
              <div className="mt-2.5 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${complete ? "bg-emerald-400" : "german-gradient"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[10px] opacity-60 mt-1">{done}/{quest.target}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
