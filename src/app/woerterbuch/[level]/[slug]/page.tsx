import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadWordsForLevel, type PublicWord, type SeoLevel, SEO_LEVELS } from "@/lib/seoData";
import PublicCta from "@/components/PublicCta";
import SpeakButton from "@/components/SpeakButton";

export const dynamic = "force-static"; // on-demand ISR: first visit builds + caches

type Params = Promise<{ level: string; slug: string }>;

async function getWord(level: string, slug: string): Promise<{ word: PublicWord; level: SeoLevel; related: PublicWord[] } | null> {
  const up = level.toUpperCase() as SeoLevel;
  if (!SEO_LEVELS.includes(up)) return null;
  const words = loadWordsForLevel(up);
  const word = words.find((w) => w.slug === slug);
  if (!word) return null;
  const related = words.filter((w) => w.topic === word.topic && w.slug !== word.slug).slice(0, 8);
  return { word, level: up, related };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { level, slug } = await params;
  const res = await getWord(level, slug);
  if (!res) return { title: "German Word | SprachDost" };
  const { word } = res;
  const title = `${word.de} — meaning, article & example (${word.level} German) | SprachDost`;
  return {
    title,
    description: `"${word.de}" means "${word.en}" in German. ${word.ex ? `Example: ${word.ex}` : ""} Learn it with audio and spaced repetition — free.`,
  };
}

export default async function WordPage({ params }: { params: Params }) {
  const { level, slug } = await params;
  const res = await getWord(level, slug);
  if (!res) notFound();
  const { word, level: up, related } = res;

  const article = /^(der|die|das)\s+/i.test(word.de);

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-2xl mx-auto w-full">
      <Link href={`/woerterbuch/${up.toLowerCase()}`} className="self-start text-sm opacity-70 hover:opacity-100 mb-6">
        ← German {up} vocabulary
      </Link>

      <div className="text-xs opacity-50 mb-2">{up} German • {word.topic}</div>
      <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-4">{word.de}</h1>

      <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6 text-center">
        <SpeakButton text={word.de} className="!px-6 !py-3" />
        <p className="text-xl mt-5"><b className="text-amber-300">{word.en}</b></p>
        {article && (
          <p className="text-xs opacity-60 mt-2">
            Noun — always learn it <b>with its article</b>: <b>{word.de.split(" ")[0]}</b> {word.de.split(" ").slice(1).join(" ")}
          </p>
        )}
      </div>

      {word.ex && (
        <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
          <div className="text-xs font-bold tracking-widest opacity-60 mb-3">EXAMPLE SENTENCE</div>
          <p className="text-lg leading-relaxed">{word.ex}</p>
          {word.exEn && <p className="text-sm opacity-60 mt-2 italic">{word.exEn}</p>}
          <div className="mt-4"><SpeakButton text={word.ex} /></div>
        </div>
      )}

      {related.length > 0 && (
        <div className="w-full mb-6">
          <h2 className="text-sm font-bold opacity-70 mb-2">More {word.topic} words ({up})</h2>
          <div className="flex flex-wrap gap-1.5">
            {related.map((w) => (
              <Link key={w.slug} href={`/woerterbuch/${up.toLowerCase()}/${w.slug}`} className="glass rounded-full px-3 py-1.5 text-sm hover:border-amber-400/40 transition-all">
                {w.de}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-3xl w-full p-6 border border-amber-400/40 mb-8 text-center">
        <div className="font-extrabold mb-1">🔊 Learn &ldquo;{word.de}&rdquo; so it sticks</div>
        <p className="text-sm opacity-70 mb-4">
          Flashcards with spaced repetition resurface this word right before you forget it — free in the app.
        </p>
        <Link href={`/vocab?level=${up}`} className="btn-primary text-sm !py-3 !px-7 inline-block">
          Practice this word →
        </Link>
      </div>

      <PublicCta />
    </main>
  );
}
