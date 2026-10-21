import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SEO_LEVELS, loadGrammarForLevel, type SeoLevel } from "@/lib/seoData";
import PublicCta from "@/components/PublicCta";
import GrammarTeaser from "@/components/GrammarTeaser";
import SpeakButton from "@/components/SpeakButton";

export const dynamicParams = false;

export function generateStaticParams() {
  const out: { level: string; topic: string }[] = [];
  for (const level of SEO_LEVELS) {
    for (const t of loadGrammarForLevel(level)) out.push({ level: level.toLowerCase(), topic: t.id });
  }
  return out;
}

async function getTopic(level: string, topic: string) {
  const up = level.toUpperCase() as SeoLevel;
  if (!SEO_LEVELS.includes(up)) return null;
  const found = loadGrammarForLevel(up).find((t) => t.id === topic);
  return found ? { topic: found, level: up } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ level: string; topic: string }> }): Promise<Metadata> {
  const { level, topic } = await params;
  const res = await getTopic(level, topic);
  const title = res ? `${res.topic.title} — German ${res.level} Grammar | SprachDost` : "German Grammar | SprachDost";
  return {
    title,
    description: res
      ? `${res.topic.title} explained in simple English for German ${res.level}: rule, examples, tables and free practice questions.`
      : "German grammar explained in simple English.",
  };
}

export default async function GrammarTopicPage({ params }: { params: Promise<{ level: string; topic: string }> }) {
  const { level, topic } = await params;
  const res = await getTopic(level, topic);
  if (!res) notFound();
  const { topic: t, level: up } = res;

  const all = loadGrammarForLevel(up);
  const idx = all.findIndex((x) => x.id === t.id);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;
  const teaser = t.questions.slice(0, 3);

  // first German sentence of the lesson for the audio teaser
  const firstDe = t.lesson.split("\n").find((line) => /[äöüß]|[A-ZÄÖÜ]/.test(line) && line.length > 12) ?? t.lesson.slice(0, 140);

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-2xl mx-auto w-full">
      <Link href={`/grammatik/${up.toLowerCase()}`} className="self-start text-sm opacity-70 hover:opacity-100 mb-6">
        ← German {up} topics
      </Link>
      <h1 className="text-3xl font-extrabold text-center mb-2">{t.title}</h1>
      <p className="text-xs opacity-50 mb-6">German Grammar • Level {up} • Goethe syllabus</p>

      <article className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
        <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{t.lesson}</p>
        <div className="mt-5">
          <SpeakButton text={firstDe} />
        </div>
      </article>

      {teaser.length > 0 && (
        <>
          <h2 className="text-lg font-extrabold mb-3 self-start">Try {teaser.length} questions — free</h2>
          <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
            <GrammarTeaser questions={teaser} />
          </div>
        </>
      )}

      <PublicCta text={`In the app: 400+ questions on this exact topic, spaced repetition and AI exam grading.`} />

      <div className="w-full grid grid-cols-2 gap-2 mt-8 text-sm">
        {prev ? (
          <Link href={`/grammatik/${up.toLowerCase()}/${prev.id}`} className="glass rounded-xl px-4 py-3 text-left hover:border-amber-400/40 transition-all">
            ← {prev.title}
          </Link>
        ) : <span />}
        {next && (
          <Link href={`/grammatik/${up.toLowerCase()}/${next.id}`} className="glass rounded-xl px-4 py-3 text-right hover:border-amber-400/40 transition-all">
            {next.title} →
          </Link>
        )}
      </div>
    </main>
  );
}
