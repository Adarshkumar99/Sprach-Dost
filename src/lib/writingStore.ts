"use client";

/**
 * Schreibtrainer attempt history — localStorage `sprachdost_writing`, cloud-synced.
 */

import { pushProgressToCloud } from "./supabase";

export type WritingAttempt = {
  id: string;
  prompt: string;
  level: string;
  date: number;
  score: number | null; // out of 15
  text: string;
};

const KEY = "sprachdost_writing";
const MAX = 30;

export function loadAttempts(): WritingAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as WritingAttempt[]) : [];
  } catch {
    return [];
  }
}

export function saveAttempt(a: Omit<WritingAttempt, "id" | "date">) {
  if (typeof window === "undefined") return;
  const full: WritingAttempt = { ...a, id: `wr-${Date.now()}`, date: Date.now() };
  const all = [full, ...loadAttempts().filter((x) => x.id !== full.id)].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(all));
  pushProgressToCloud();
}
