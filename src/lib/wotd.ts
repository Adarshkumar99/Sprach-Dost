/**
 * Word of the Day — deterministic pick from the whole vocab bank.
 * Same algorithm on client (WordOfTheDay.tsx) and server (push cron).
 */

import type { VocabWord } from "./vocab";
import { VOCAB } from "./vocab";

export type WotD = VocabWord & { date: string };

/** deterministic word of the day from a list, seeded by the IST date */
export function pickWordOfTheDay(words: VocabWord[], dateSeed?: string): VocabWord | null {
  if (words.length === 0) return null;
  const today =
    dateSeed ??
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  let h = 0;
  for (const ch of today) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return words[h % words.length];
}

/** full bank for the server (seed + generated packs from public/vocab) */
export async function serverWordBank(): Promise<VocabWord[]> {
  const all: VocabWord[] = [...VOCAB];
  try {
    const { readFile } = await import("fs/promises");
    const path = await import("path");
    for (const lvl of ["A1", "A2", "B1", "B2", "C1"]) {
      try {
        const file = path.join(process.cwd(), "public", "vocab", `${lvl}.json`);
        const arr = JSON.parse(await readFile(file, "utf-8")) as VocabWord[];
        if (Array.isArray(arr)) {
          for (const item of arr) {
            if (item?.de && item?.en) all.push({ ...item, level: item.level ?? (lvl as VocabWord["level"]) });
          }
        }
      } catch {
        /* pack missing — fine */
      }
    }
  } catch {
    /* fall back to seed only */
  }
  return all;
}

export async function wordOfTheDay(): Promise<WotD | null> {
  const word = pickWordOfTheDay(await serverWordBank());
  if (!word) return null;
  return { ...word, date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) };
}
