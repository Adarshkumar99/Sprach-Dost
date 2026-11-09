/**
 * XP economy — lifetime XP, daily XP and leagues.
 *
 * XP is awarded for every learning action (flashcards, grammar, games,
 * dictation, stories, exams, speaking). Stored in localStorage; the weekly
 * part flows into the existing weekly_scores leaderboard via weekly.ts.
 *
 * Leagues are computed from the CURRENT week's XP (Mon-start ISO week,
 * same as weekly.ts weekKey) — Bronze → Diamond.
 */

import { weekKey } from "./weekly";

const XP_TOTAL_KEY = "sprachdost_xp";
const XP_DAILY_KEY = "sprachdost_xp_daily";

export type League = {
  name: string;
  icon: string;
  min: number;
  color: string;
};

export const LEAGUES: League[] = [
  { name: "Bronze", icon: "🥉", min: 0, color: "#cd7f32" },
  { name: "Silver", icon: "🥈", min: 100, color: "#c0c0c0" },
  { name: "Gold", icon: "🥇", min: 300, color: "#f59e0b" },
  { name: "Platinum", icon: "💎", min: 700, color: "#38bdf8" },
  { name: "Diamond", icon: "💠", min: 1500, color: "#a78bfa" },
];

/* ── lifetime XP ── */

export function getXp(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(XP_TOTAL_KEY) ?? "0") || 0;
}

/* ── daily XP (per IST day) ── */

export function getDailyXp(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = JSON.parse(localStorage.getItem(XP_DAILY_KEY) ?? "null");
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (raw?.day === today) return Number(raw.xp) || 0;
  } catch { /* noop */ }
  return 0;
}

export type XpReason =
  | "flashcard" | "grammar" | "dictation" | "story" | "exam"
  | "game" | "speaking" | "quest" | "writing";

/** XP amounts per action */
export const XP_VALUES: Record<XpReason, number> = {
  flashcard: 2,
  grammar: 1,
  dictation: 3,
  story: 10,
  exam: 25,
  game: 1,
  speaking: 15,
  quest: 20,
  writing: 10,
};

/** Award XP for an action. Records lifetime + daily totals. Fire & forget. */
export function awardXp(reason: XpReason, amount = XP_VALUES[reason]) {
  if (typeof window === "undefined" || amount <= 0) return;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  try {
    localStorage.setItem(XP_TOTAL_KEY, String(getXp() + amount));
    const raw = JSON.parse(localStorage.getItem(XP_DAILY_KEY) ?? "null");
    const xp = raw?.day === today ? (Number(raw.xp) || 0) + amount : amount;
    localStorage.setItem(XP_DAILY_KEY, JSON.stringify({ day: today, xp }));
  } catch { /* noop */ }
}

/* ── leagues (from current week's XP) ── */

export function leagueForWeekXp(weekXp: number): League {
  let league = LEAGUES[0];
  for (const l of LEAGUES) if (weekXp >= l.min) league = l;
  return league;
}

export function nextLeague(weekXp: number): League | null {
  return LEAGUES.find((l) => l.min > weekXp) ?? null;
}

/** Current week's XP as stored by weekly.ts (weekKey-synced localStorage) */
export function currentWeekXp(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = JSON.parse(localStorage.getItem("sprachdost_weekly") ?? "null");
    if (raw?.weekKey === weekKey()) return weeklyXpOf(raw);
  } catch { /* noop */ }
  return 0;
}

function weeklyXpOf(d: Record<string, number>): number {
  return (
    (d.words ?? 0) * 2 + (d.minutes ?? 0) + (d.stories ?? 0) * 10 +
    (d.dictation ?? 0) * 3 + (d.pronCorrect ?? 0) + (d.games ?? 0)
  );
}
