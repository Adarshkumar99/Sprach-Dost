/**
 * Local progress store (streaks, sessions, vocab) — works offline with zero setup.
 * Syncs to Supabase automatically when the user is logged in.
 */

import { pushProgressToCloud } from "./supabase";

export type ProgressData = {
  sessions: number;
  minutes: number;
  streak: number;
  lastDay: string; // YYYY-MM-DD
  wordsLearned: number;
  lastLevel: string;
};

const KEY = "sprachdost_progress";

const EMPTY: ProgressData = {
  sessions: 0,
  minutes: 0,
  streak: 0,
  lastDay: "",
  wordsLearned: 0,
  lastLevel: "A1",
};

export function getProgress(): ProgressData {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function recordSession(opts: { minutes?: number; words?: number; level?: string }) {
  const p = getProgress();
  const t = today();
  p.sessions += 1;
  p.minutes += opts.minutes ?? 5;
  p.wordsLearned += opts.words ?? 0;
  p.lastLevel = opts.level ?? p.lastLevel;
  if (p.lastDay === t) {
    // already counted today
  } else if (p.lastDay === yesterday()) {
    p.streak += 1;
  } else {
    p.streak = 1;
  }
  p.lastDay = t;
  localStorage.setItem(KEY, JSON.stringify(p));
  pushProgressToCloud();
}

/** approximate how many vocab items are listed in a feedback "vocab" line */
export function countVocab(vocab: string): number {
  return vocab.split(/,|;/).filter((w) => w.trim().length > 2).length;
}
