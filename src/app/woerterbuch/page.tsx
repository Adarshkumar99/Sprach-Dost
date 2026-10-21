import type { Metadata } from "next";
import Link from "next/link";
import { SEO_LEVELS, loadWordsForLevel } from "@/lib/seoData";
import PublicCta from "@/components/PublicCta";

export const metadata: Metadata = {
  title: "German Vocabulary Lists A1–C1 — Words with Articles, Meanings & Examples | SprachDost",
  description:
    "Free German vocabulary lists for every CEFR level: nouns with der/die/das, verbs, example sentences and English meanings. Learn with spaced-repetition flashcards in the app.",
};

export default function WoerterbuchHubPage() {
  const levels = SEO_LEVELS.map((level) => ({ level, words: loadWordsForLevel(level) }));

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-3xl mx-auto w-full">
      <Link href="/" className="self-start text-sm opacity-70 hover:opacity-100 mb-6">← SprachDost</Link>
      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-3">German Vocabulary A1–C1</h1>
      <p className="opacity-70 text-center text-sm mb-10 max-w-xl">
        Every word with its article, English meaning and a real example sentence. Tap any level to browse — tap any word
        to hear it and learn it properly.
      </p>

      <div className="w-full grid sm:grid-cols-2 gap-3 mb-10">
        {levels.map(({ level, words }) =>
          words.length === 0 ? null : (
            <Link
              key={level}
              href={`/woerterbuch/${level.toLowerCase()}`}
              className="glass rounded-2xl p-5 text-left hover:border-amber-400/40 transition-all"
            >
              <div className="font-extrabold text-lg">Level {level}</div>
              <div className="text-xs opacity-60">{words.length} words with examples 🔊</div>
            </Link>
          )
        )}
      </div>

      <PublicCta />
    </main>
  );
}
