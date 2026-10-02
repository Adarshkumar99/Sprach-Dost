"use client";

/**
 * Client vocab store:
 *  - always includes the hand-verified seed set (src/lib/vocab.ts)
 *  - merges generated packs from /vocab/<LEVEL>.json (produced by scripts/generate-vocab.mjs)
 *    → those files appear once you run the generator, growing A1→1000, A2→1500, B1→2000
 */

import { VOCAB, type VocabWord } from "./vocab";

let cache: VocabWord[] | null = null;
let pending: Promise<VocabWord[]> | null = null;

const LEVELS = ["A1", "A2", "B1"];

export async function loadAllWords(): Promise<VocabWord[]> {
  if (cache) return cache;
  if (pending) return pending;

  pending = (async () => {
    const merged: VocabWord[] = [...VOCAB];
    const seen = new Set(VOCAB.map((v) => `${v.level}|${v.de.toLowerCase()}`));

    for (const lvl of LEVELS) {
      try {
        const res = await fetch(`/vocab/${lvl}.json`);
        if (!res.ok) continue; // pack not generated yet — fine
        const arr: unknown = await res.json();
        if (!Array.isArray(arr)) continue;
        for (const item of arr as VocabWord[]) {
          if (!item?.de || !item?.en) continue;
          const k = `${item.level}|${String(item.de).toLowerCase()}`;
          if (seen.has(k)) continue;
          seen.add(k);
          merged.push(item);
        }
      } catch {
        /* pack missing — skip */
      }
    }

    cache = merged;
    return merged;
  })();

  return pending;
}

export async function wordsForLevel(level: string, topic: string | "All"): Promise<VocabWord[]> {
  const all = await loadAllWords();
  return all.filter((v) => v.level === level && (topic === "All" || v.topic === topic));
}

export async function topicsOfLevel(level: string): Promise<string[]> {
  const all = await loadAllWords();
  return [...new Set(all.filter((v) => v.level === level).map((v) => v.topic))];
}
