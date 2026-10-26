/**
 * Weekly challenges — goals reset every Monday, progress tracked in localStorage.
 * Syncs to Supabase automatically when logged in (via pushProgressToCloud),
 * and writes a leaderboard row into weekly_scores.
 */

import { pushProgressToCloud, getSupabase, getUser, ensureProfile } from "./supabase";

export type WeeklyData = {
  weekKey: string;          // ISO-ish "2026-W42"
  words: number;            // new vocab words learned
  minutes: number;          // practice minutes
  stories: number;          // stories finished (quiz completed)
  examMinutes: number;      // exam simulator minutes
  pronCorrect: number;      // pronunciation trainer correct answers
  dictation: number;        // dictation exercises completed
};

export const GOALS = [
  { key: "words", icon: "📇", label: "New words", target: 30 },
  { key: "minutes", icon: "⏱️", label: "Practice minutes", target: 60 },
  { key: "stories", icon: "📖", label: "Stories completed", target: 5 },
  { key: "dictation", icon: "🎧", label: "Dictations", target: 10 },
] as const;

const KEY = "sprachdost_weekly";

export function weekKey(d = new Date()): string {
  // Monday-start ISO week: 2026-W42
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((tmp.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const EMPTY: WeeklyData = { weekKey: "", words: 0, minutes: 0, stories: 0, examMinutes: 0, pronCorrect: 0, dictation: 0 };

export function getWeekly(): WeeklyData {
  if (typeof window === "undefined") return EMPTY;
  const k = weekKey();
  try {
    const raw = localStorage.getItem(KEY);
    const data: WeeklyData = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
    if (data.weekKey !== k) {
      const fresh = { ...EMPTY, weekKey: k };
      localStorage.setItem(KEY, JSON.stringify(fresh));
      return fresh;
    }
    return data;
  } catch { return EMPTY; }
}

/** XP for the weekly leaderboard */
export function weeklyXp(d: WeeklyData): number {
  return d.words * 2 + d.minutes + d.stories * 10 + d.dictation * 3 + d.pronCorrect;
}

/** Push (or create) this user's leaderboard row for the current week. Fire & forget. */
async function upsertWeeklyScore(data: WeeklyData) {
  const sb = getSupabase();
  if (!sb) return;
  const user = await getUser();
  if (!user) return;
  // name from profiles (picks up edits from Edit Profile), auth metadata as fallback
  const profileName = await ensureProfile().catch(() => null);
  const meta = user.user_metadata ?? {};
  const displayName: string =
    profileName || meta.full_name || meta.name || (user.email ? user.email.split("@")[0] : "Learner");
  await sb.from("weekly_scores").upsert(
    {
      user_id: user.id,
      week_key: data.weekKey,
      display_name: displayName,
      words: data.words,
      minutes: data.minutes,
      stories: data.stories,
      dictation: data.dictation,
      xp: weeklyXp(data),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,week_key" }
  );
}

export function recordWeekly(part: Partial<Omit<WeeklyData, "weekKey">>) {
  const d = getWeekly();
  const out: WeeklyData = {
    ...d,
    words: d.words + (part.words ?? 0),
    minutes: d.minutes + (part.minutes ?? 0),
    stories: d.stories + (part.stories ?? 0),
    examMinutes: d.examMinutes + (part.examMinutes ?? 0),
    pronCorrect: d.pronCorrect + (part.pronCorrect ?? 0),
    dictation: d.dictation + (part.dictation ?? 0),
  };
  localStorage.setItem(KEY, JSON.stringify(out));
  pushProgressToCloud();
  upsertWeeklyScore(out).catch(() => {});
}

/** how many goal weeks in a row were completed (acknowledged bottom) */
export function weeklySummary(d: WeeklyData = getWeekly()) {
  const done = GOALS.filter((g) => Number(d[g.key] ?? 0) >= g.target).length;
  return { done, total: GOALS.length, week: d.weekKey };
}
