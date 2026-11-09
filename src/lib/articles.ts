/**
 * Der/Die/Das sprint — noun dataset built from the vocab packs.
 * Nouns whose `de` field starts with the article (e.g. "der Tag") are used;
 * wrong answers loop back into the round for in-game spaced repetition.
 */

import { loadAllWords } from "./vocabStore";

export type Article = "der" | "die" | "das";

export type Noun = {
  noun: string;     // without article
  article: Article;
  en: string;
  level: string;
};

export function stripArticle(de: string): { article: Article; noun: string } | null {
  const m = de.match(/^(der|die|das)\s+(.+)$/i);
  if (!m) return null;
  return { article: m[1].toLowerCase() as Article, noun: m[2].trim() };
}

let cache: Noun[] | null = null;

export async function loadNouns(): Promise<Noun[]> {
  if (cache) return cache;
  const words = await loadAllWords();
  const seen = new Set<string>();
  const out: Noun[] = [];
  for (const w of words) {
    const s = stripArticle(w.de);
    if (!s || !w.en) continue;
    const k = s.noun.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ noun: s.noun, article: s.article, en: w.en, level: w.level });
  }
  cache = out;
  return out;
}

/** shuffle helper (Fisher-Yates) */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
