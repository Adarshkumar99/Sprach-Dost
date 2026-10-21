"use client";

/**
 * Test Series — full Goethe-style mock exams (50/level, A1–B2), AI-generated.
 * public/tests/<LEVEL>.json. Tests 1–FREE_COUNT free, the rest Pro.
 */

export type SeriesMcq = { q: string; options: string[]; answer: number; why?: string };
export type SeriesTask = {
  id: string;
  title: string;
  instructionsEn: string;
  promptDe: string;
  keywords: string[];
  minWords: number;
};

export type SeriesTest = {
  id: string;
  title: string;
  lesen: { title: string; text: string; questions: SeriesMcq[] };
  horen: { title: string; scriptDe: string; questions: SeriesMcq[] };
  schreiben: { title: string; promptDe: string; promptEn: string; wordTarget: number; bullets: string[] };
  sprechen: { tasks: SeriesTask[] };
};

export const SERIES_LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type SeriesLevel = (typeof SERIES_LEVELS)[number];
export const FREE_COUNT = 10;

export async function loadSeries(level: SeriesLevel): Promise<SeriesTest[]> {
  try {
    const res = await fetch(`/tests/${level}.json`);
    if (!res.ok) return [];
    const arr = await res.json();
    return Array.isArray(arr) ? (arr as SeriesTest[]) : [];
  } catch {
    return [];
  }
}

/** is a test (by 1-based index) available on the free plan? */
export function isFreeTest(index1: number): boolean {
  return index1 <= FREE_COUNT;
}
