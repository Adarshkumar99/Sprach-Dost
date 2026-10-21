/**
 * Server-side content loaders for the public SEO pages.
 * Reads the generated JSON packs from /public + the TS seed — no client fetches.
 */

import fs from "fs";
import path from "path";
import { VOCAB, type VocabWord } from "@/lib/vocab";

export type PublicWord = VocabWord & { slug: string };

export function readPublicJson<T>(relPath: string): T | null {
  try {
    const file = path.join(process.cwd(), "public", relPath);
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

export function slugify(word: string): string {
  return String(word)
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const SEO_LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type SeoLevel = (typeof SEO_LEVELS)[number];

/** every vocab word (seed + generated), deduped per level, with slug */
export function loadWordsForLevel(level: SeoLevel): PublicWord[] {
  const out: PublicWord[] = [];
  const seen = new Set<string>();
  for (const w of VOCAB.filter((v) => v.level === level)) {
    const k = `${w.de.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ ...w, slug: slugify(w.de) });
  }
  const gen = readPublicJson<VocabWord[]>(`vocab/${level}.json`) ?? [];
  for (const w of gen) {
    if (!w?.de || !w?.en) continue;
    const k = `${w.de.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ ...w, level, slug: slugify(w.de) });
  }
  // slug collisions: keep the first, drop the rest
  const bySlug = new Set<string>();
  return out.filter((w) => {
    if (bySlug.has(w.slug)) return false;
    bySlug.add(w.slug);
    return true;
  });
}

export type Story = {
  id: string;
  title: string;
  paragraphs: { de: string; en: string }[];
  vocab: { de: string; en: string }[];
  questions: { q: string; options: string[]; answer: number; why?: string }[];
  level: string;
};

export function loadStoriesForLevel(level: SeoLevel): (Story & { slug: string })[] {
  const stories = readPublicJson<Story[]>(`stories/${level}.json`) ?? [];
  const seen = new Set<string>();
  return stories
    .filter((s) => s?.id && Array.isArray(s.paragraphs))
    .map((s) => ({ ...s, level, slug: s.id }))
    .filter((s) => {
      if (seen.has(s.slug)) return false;
      seen.add(s.slug);
      return true;
    });
}

export type GrammarTopicSeo = { id: string; title: string; lesson: string; questions: { q: string; options: string[]; answer: number; why?: string }[] };

export function loadGrammarForLevel(level: SeoLevel): GrammarTopicSeo[] {
  return readPublicJson<GrammarTopicSeo[]>(`grammar/${level}.json`) ?? [];
}
