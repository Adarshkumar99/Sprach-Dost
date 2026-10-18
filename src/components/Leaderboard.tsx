"use client";

/**
 * Weekly leaderboard — top XP earners for the current ISO week.
 * Reads the `weekly_scores` table (Supabase); login required.
 */

import { useCallback, useEffect, useState } from "react";
import { getSupabase, getUser, ensureProfile, onAuthChange } from "@/lib/supabase";
import { getWeekly, weeklyXp, weekKey } from "@/lib/weekly";

type Row = {
  user_id: string;
  display_name: string;
  xp: number;
  words: number;
  minutes: number;
};

export default function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<{ id: string; xp: number; rank: number | null } | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const sb = getSupabase();
    const user = await getUser();
    setSignedIn(!!user);
    if (!sb || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    await ensureProfile();
    const wk = weekKey();
    const { data } = await sb
      .from("weekly_scores")
      .select("user_id, display_name, xp, words, minutes")
      .eq("week_key", wk)
      .order("xp", { ascending: false })
      .limit(50);
    const list = (data ?? []) as Row[];
    setRows(list.slice(0, 20));
    const myXp = weeklyXp(getWeekly());
    const idx = list.findIndex((r) => r.user_id === user.id);
    setMe({ id: user.id, xp: myXp, rank: idx >= 0 ? idx + 1 : list.length > 0 ? null : 1 });
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => load());
    return onAuthChange(() => queueMicrotask(() => load()));
  }, [load]);

  if (signedIn === null || (loading && signedIn)) {
    return (
      <div className="glass rounded-3xl p-6 w-full max-w-4xl mt-6 text-center text-sm opacity-60">
        Loading leaderboard…
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="glass rounded-3xl p-6 w-full max-w-4xl mt-6 text-center">
        <div className="font-bold text-lg mb-1">🏅 Weekly Leaderboard</div>
        <p className="text-sm opacity-70">
          Log in to compete with other learners on the weekly XP board.
        </p>
        <a href="/login" className="btn-primary inline-block text-sm mt-4 !py-2.5 !px-6">
          Log in →
        </a>
      </div>
    );
  }

  const medal = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`);

  return (
    <div className="glass rounded-3xl p-6 w-full max-w-4xl mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-bold text-lg">🏅 Weekly Leaderboard</div>
          <div className="text-xs opacity-60">{weekKey()} • XP = words + minutes + stories ×10</div>
        </div>
        <button onClick={load} className="text-xs glass rounded-full px-3 py-1.5 opacity-80 hover:opacity-100">
          ↻ Refresh
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm opacity-70 text-center py-4">
          No entries yet this week — practise anything and be the first on the board!
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div
              key={r.user_id}
              className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm ${
                r.user_id === me?.id ? "bg-white/10 border border-yellow-400/40 font-bold" : "bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 text-center">{medal(i + 1)}</span>
                <span className="truncate">{r.display_name}</span>
              </div>
              <div className="flex items-center gap-4 text-xs opacity-80">
                <span>📚 {r.words}</span>
                <span>⏱️ {r.minutes}m</span>
                <span className="font-extrabold text-amber-300 text-sm">{r.xp} XP</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {me && (
        <p className="text-xs opacity-60 mt-3 text-center">
          Your XP this week: <b className="text-amber-300">{me.xp}</b>
          {me.rank ? ` • rank #${me.rank}` : " • outside top 50, keep going!"}
        </p>
      )}
    </div>
  );
}
