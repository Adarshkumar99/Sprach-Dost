"use client";

/**
 * Fehlerheft — the mistake notebook.
 * Every correction (Anna/Lehrer KORREKTUR, exam grading feedback) lands here,
 * resurfaces via the SRS engine, and can be marked as learned.
 */

import { pushProgressToCloud } from "./supabase";

export type Mistake = {
  id: string;
  wrong: string; // the student's sentence / task text
  note: string; // the correction / explanation
  context: string; // scenario or topic title
  date: number; // ms epoch
  resolved?: boolean;
};

const KEY = "sprachdost_mistakes";
const MAX = 200;

export function getMistakes(): Mistake[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as Mistake[]) : [];
  } catch {
    return [];
  }
}

/** add a correction — dedupes on wrong+note so repeated mistakes don't spam the list */
export function addMistake(m: { wrong: string; note: string; context: string }) {
  if (typeof window === "undefined") return;
  const wrong = m.wrong.trim();
  const note = m.note.trim();
  if (!wrong || !note || /^none$/i.test(note)) return;

  const all = getMistakes();
  const dup = all.find(
    (x) => x.wrong.toLowerCase() === wrong.toLowerCase() && !x.resolved
  );
  if (dup) {
    dup.date = Date.now(); // bumped — still a live mistake
  } else {
    all.unshift({
      id: `mis-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      wrong,
      note,
      context: m.context,
      date: Date.now(),
    });
  }
  const sorted = all.sort((a, b) => b.date - a.date).slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(sorted));
  pushProgressToCloud();
}

export function updateMistake(id: string, patch: Partial<Pick<Mistake, "resolved">>) {
  if (typeof window === "undefined") return;
  const all = getMistakes().map((m) => (m.id === id ? { ...m, ...patch } : m));
  localStorage.setItem(KEY, JSON.stringify(all));
  pushProgressToCloud();
}

export function removeMistake(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(getMistakes().filter((m) => m.id !== id)));
  pushProgressToCloud();
}
