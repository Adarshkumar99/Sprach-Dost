import type { MetadataRoute } from "next";
import { SEO_LEVELS, loadWordsForLevel, loadStoriesForLevel, loadGrammarForLevel } from "@/lib/seoData";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sprach-dost.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const core: MetadataRoute.Sitemap = ["", "/practice", "/grammatik", "/woerterbuch", "/lesen", "/pro"].map((p) => ({
    url: `${SITE}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.8,
  }));

  const grammar: MetadataRoute.Sitemap = [];
  const stories: MetadataRoute.Sitemap = [];
  const words: MetadataRoute.Sitemap = [];

  for (const level of SEO_LEVELS) {
    for (const t of loadGrammarForLevel(level)) {
      grammar.push({ url: `${SITE}/grammatik/${level.toLowerCase()}/${t.id}`, lastModified: now, changeFrequency: "monthly", priority: 0.7 });
    }
    for (const s of loadStoriesForLevel(level)) {
      stories.push({ url: `${SITE}/lesen/${level.toLowerCase()}/${s.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.6 });
    }
    for (const w of loadWordsForLevel(level)) {
      words.push({ url: `${SITE}/woerterbuch/${level.toLowerCase()}/${w.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.5 });
    }
  }

  return [...core, ...grammar, ...stories, ...words];
}
