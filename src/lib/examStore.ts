"use client";

/**
 * Exam attempt history — localStorage `sprachdost_exams`, synced via Supabase.
 * Kept as an ARRAY (not a record), so the cloud merge unions by `date`.
 */

import { pushProgressToCloud } from "./supabase";

export type ExamAttempt = {
  id: string;
  format: string; // "goethe" | "telc" | "osd"
  level: string; // "A1" | "A2" | "B1"
  date: number; // ms epoch
  overall: number; // 0-100
  perPart: { title: string; pct: number }[];
  rubric?: {
    fluency: number;
    vocab: number;
    accuracy: number;
    pronunciation: number;
    cefr: string;
  };
};

const KEY = "sprachdost_exams";
const MAX = 30;

export function getExamAttempts(): ExamAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as ExamAttempt[]) : [];
  } catch {
    return [];
  }
}

export function saveExamAttempt(attempt: ExamAttempt) {
  if (typeof window === "undefined") return;
  const all = [...getExamAttempts().filter((a) => a.id !== attempt.id), attempt];
  all.sort((a, b) => b.date - a.date);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, MAX)));
  pushProgressToCloud();
}
