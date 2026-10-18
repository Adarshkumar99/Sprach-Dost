/**
 * Local progress store (streaks, sessions, vocab) — works offline with zero setup.
 * Syncs to Supabase automatically when the user is logged in.
 *
 * Day boundaries use IST (Asia/Kolkata) so an Indian user practising at
 * 11pm–1am isn't punished by UTC rollover.
 */

import { pushProgressToCloud } from "./supabase";
import { recordWeekly, weekKey } from "./weekly";

export type ProgressData = {
  sessions: number;
  minutes: number;
  streak: number;
  lastDay: string; // YYYY-MM-DD (IST)
  wordsLearned: number;
  lastLevel: string;
  freezes: number; // streak shields available
  freezeWeek: string; // ISO week the freeze credits were last refreshed
};

const KEY = "sprachdost_progress";

const EMPTY: ProgressData = {
  sessions: 0,
  minutes: 0,
  streak: 0,
  lastDay: "",
  wordsLearned: 0,
  lastLevel: "A1",
  freezes: 1,
  freezeWeek: "",
};

const MAX_FREEZES = 2;

export function getProgress(): ProgressData {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function istDate(daysAgo = 0): string {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

/** weekly freeze refresh: 1 fresh shield per ISO week, up to MAX_FREEZES banked */
function refreshFreezes(p: ProgressData): ProgressData {
  const wk = weekKey();
  if (p.freezeWeek !== wk) {
    p.freezeWeek = wk;
    p.freezes = Math.min(MAX_FREEZES, (p.freezes ?? 0) + 1);
  }
  return p;
}

export function recordSession(opts: { minutes?: number; words?: number; level?: string }) {
  const p0 = getProgress();
  const p = refreshFreezes(p0);
  const t = istDate();
  p.sessions += 1;
  p.minutes += opts.minutes ?? 5;
  p.wordsLearned += opts.words ?? 0;
  p.lastLevel = opts.level ?? p.lastLevel;

  if (p.lastDay === t) {
    // already counted today
  } else if (p.lastDay && daysBetween(p.lastDay, t) === 1) {
    p.streak += 1;
  } else if (p.lastDay && daysBetween(p.lastDay, t) === 2 && p.freezes > 0) {
    // missed exactly yesterday → burn a streak shield, streak survives
    p.freezes -= 1;
    p.streak += 1;
  } else {
    p.streak = 1;
  }
  p.lastDay = t;
  localStorage.setItem(KEY, JSON.stringify(p));
  recordWeekly({ minutes: opts.minutes ?? 5, words: opts.words ?? 0 }); // feed weekly challenges
  pushProgressToCloud();
}

/** burn a shield manually (UI) — for when the user knows they'll miss a day */
export function applyStreakFreeze(): boolean {
  const p = refreshFreezes(getProgress());
  if (p.freezes <= 0) return false;
  p.freezes -= 1;
  localStorage.setItem(KEY, JSON.stringify(p));
  pushProgressToCloud();
  return true;
}

/** approximate how many vocab items are listed in a feedback "vocab" line */
export function countVocab(vocab: string): number {
  return vocab.split(/,|;/).filter((w) => w.trim().length > 2).length;
}
