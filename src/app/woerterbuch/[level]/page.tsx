import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SEO_LEVELS, loadWordsForLevel, type SeoLevel } from "@/lib/seoData";
import PublicCta from "@/components/PublicCta";

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_LEVELS.map((level) => ({ level: level.toLowerCase() }));
}

async function validLevel(level: string): Promise<SeoLevel | null> {
  const up = level.toUpperCase() as SeoLevel;
  return SEO_LEVELS.includes(up) && loadWordsForLevel(up).length > 0 ? up : null;
}

export async function generateMetadata({ params }: { params: Promise<{ level: string }> }): Promise<Metadata> {
  const { level } = await params;
  const up = await validLevel(level);
  const n = up ? loadWordsForLevel(up).length : 0;
  return {
    title: `German ${up} Vocabulary — ${n} Words with Articles & Examples | SprachDost`,
    description: `The complete German ${up} vocabulary list: nouns with der/die/das, verbs and adjectives — every word with English meaning and an example sentence.`,
  };
}

export default async function VocabLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const up = await validLevel(level);
  if (!up) notFound();
  const words = loadWordsForLevel(up);

  const byTopic = new Map<string, typeof words>();
  for (const w of words) {
    (byTopic.get(w.topic) ?? byTopic.set(w.topic, []).get(w.topic)!).push(w);
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-3xl mx-auto w-full">
      <Link href="/woerterbuch" className="self-start text-sm opacity-70 hover:opacity-100 mb-6">← All levels</Link>
      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2">German {up} Vocabulary</h1>
      <p className="opacity-70 text-center text-sm mb-10">{words.length} words across {byTopic.size} topics — tap any word for audio, examples & related words.</p>

      {[...byTopic.entries()].map(([topic, ws]) => (
        <section key={topic} className="w-full mb-8">
          <h2 className="text-lg font-extrabold mb-2">{topic} <span className="text-xs font-normal opacity-50">({ws.length})</span></h2>
          <div className="flex flex-wrap gap-1.5">
            {ws.map((w) => (
              <Link
                key={`${w.slug}`}
                href={`/woerterbuch/${up.toLowerCase()}/${w.slug}`}
                className="glass rounded-full px-3 py-1.5 text-sm hover:border-amber-400/40 transition-all"
              >
                {w.de}
              </Link>
            ))}
          </div>
        </section>
      ))}

      <PublicCta text={`Learn these ${up} words properly — flashcards with spaced repetition remind you right before you forget.`} />
    </main>
  );
}
