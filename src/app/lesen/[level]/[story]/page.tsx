import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadStoriesForLevel, type SeoLevel, SEO_LEVELS } from "@/lib/seoData";
import PublicCta from "@/components/PublicCta";
import SpeakButton from "@/components/SpeakButton";

export const dynamicParams = false;

export function generateStaticParams() {
  const out: { level: string; story: string }[] = [];
  for (const level of SEO_LEVELS) {
    for (const s of loadStoriesForLevel(level)) out.push({ level: level.toLowerCase(), story: s.slug });
  }
  return out;
}

async function getStory(level: string, story: string) {
  const up = level.toUpperCase() as SeoLevel;
  if (!SEO_LEVELS.includes(up)) return null;
  const found = loadStoriesForLevel(up).find((s) => s.slug === story);
  return found ? { story: found, level: up } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ level: string; story: string }> }): Promise<Metadata> {
  const { level, story } = await params;
  const res = await getStory(level, story);
  const title = res ? `${res.story.title} — German ${res.level} Reading Practice | SprachDost` : "German Reading | SprachDost";
  return {
    title,
    description: res
      ? `Read "${res.story.title}" in German with English translation line by line — ${res.level} reading practice with vocabulary and quiz.`
      : "German reading practice with English translation.",
  };
}

const FREE_PARAGRAPHS = 3;

export default async function StoryPage({ params }: { params: Promise<{ level: string; story: string }> }) {
  const { level, story } = await params;
  const res = await getStory(level, story);
  if (!res) notFound();
  const { story: s, level: up } = res;
  const preview = s.paragraphs.slice(0, FREE_PARAGRAPHS);
  const rest = s.paragraphs.length - preview.length;

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-2xl mx-auto w-full">
      <Link href={`/lesen/${up.toLowerCase()}`} className="self-start text-sm opacity-70 hover:opacity-100 mb-6">
        ← Level {up} stories
      </Link>
      <h1 className="text-3xl font-extrabold text-center mb-2">{s.title}</h1>
      <p className="text-xs opacity-50 mb-8">German reading practice • Level {up} • {s.paragraphs.length} lines</p>

      <div className="w-full space-y-4 mb-8">
        {preview.map((p, i) => (
          <div key={i} className="glass rounded-2xl p-5">
            <p className="text-[15px] leading-relaxed">{p.de}</p>
            <p className="text-sm opacity-60 mt-2 italic">{p.en}</p>
            <div className="mt-3"><SpeakButton text={p.de} /></div>
          </div>
        ))}
      </div>

      {rest > 0 && (
        <div className="glass rounded-3xl w-full p-8 text-center border border-amber-400/40 mb-8">
          <div className="text-4xl mb-3">📖</div>
          <div className="font-extrabold text-lg mb-1">{rest} more lines in the app — free</div>
          <p className="text-sm opacity-70 mb-4">
            Read the full story with audio, learn its vocabulary and take the comprehension quiz.
          </p>
          <Link href="/" className="btn-primary text-sm !py-3 !px-7 inline-block">
            🚀 Continue reading — start free
          </Link>
        </div>
      )}

      {s.vocab.length > 0 && (
        <div className="glass rounded-3xl w-full p-6 mb-8">
          <div className="text-xs font-bold tracking-widest opacity-60 mb-3">WORDS FROM THIS STORY</div>
          <div className="flex flex-wrap gap-1.5">
            {s.vocab.slice(0, 12).map((v) => (
              <span key={v.de} className="glass rounded-full px-3 py-1.5 text-sm">
                <b>{v.de}</b> — {v.en}
              </span>
            ))}
          </div>
        </div>
      )}

      <PublicCta text="200+ German stories with line-by-line English, quizzes and audio — free on SprachDost." />
    </main>
  );
}
