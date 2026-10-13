/**
 * Weekly challenges — goals reset every Monday, progress tracked in localStorage.
 * Syncs to Supabase automatically when logged in (via pushProgressToCloud).
 */

import { pushProgressToCloud } from "./supabase";

export type WeeklyData = {
  weekKey: string;          // ISO-ish "2026-W42"
  words: number;            // new vocab words learned
  minutes: number;          // practice minutes
  stories: number;          // stories finished (quiz completed)
  examMinutes: number;      // exam simulator minutes
  pronCorrect: number;      // pronunciation trainer correct answers
};

export const GOALS = [
  { key: "words", icon: "📇", label: "New words", target: 30 },
  { key: "minutes", icon: "⏱️", label: "Practice minutes", target: 60 },
  { key: "stories", icon: "📖", label: "Stories completed", target: 5 },
] as const;

const KEY = "sprachdost_weekly";

function weekKey(d = new Date()): string {
  // Monday-start ISO week: 2026-W42
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((tmp.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const EMPTY: WeeklyData = { weekKey: "", words: 0, minutes: 0, stories: 0, examMinutes: 0, pronCorrect: 0 };

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

export function recordWeekly(part: Partial<Omit<WeeklyData, "weekKey">>) {
  const d = getWeekly();
  const out: WeeklyData = {
    ...d,
    words: d.words + (part.words ?? 0),
    minutes: d.minutes + (part.minutes ?? 0),
    stories: d.stories + (part.stories ?? 0),
    examMinutes: d.examMinutes + (part.examMinutes ?? 0),
    pronCorrect: d.pronCorrect + (part.pronCorrect ?? 0),
  };
  localStorage.setItem(KEY, JSON.stringify(out));
  pushProgressToCloud();
}

/** how many goal weeks in a row were completed (acknowledged bottom) */
export function weeklySummary(d: WeeklyData = getWeekly()) {
  const done = GOALS.filter((g) => Number(d[g.key] ?? 0) >= g.target).length;
  return { done, total: GOALS.length, week: d.weekKey };
}
