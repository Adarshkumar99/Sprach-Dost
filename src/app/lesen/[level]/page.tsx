import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadStoriesForLevel, type SeoLevel, SEO_LEVELS } from "@/lib/seoData";
import PublicCta from "@/components/PublicCta";

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_LEVELS.map((level) => ({ level: level.toLowerCase() }));
}

async function validLevel(level: string): Promise<SeoLevel | null> {
  const up = level.toUpperCase() as SeoLevel;
  return SEO_LEVELS.includes(up) && loadStoriesForLevel(up).length > 0 ? up : null;
}

export async function generateMetadata({ params }: { params: Promise<{ level: string }> }): Promise<Metadata> {
  const { level } = await params;
  const up = await validLevel(level);
  const n = up ? loadStoriesForLevel(up).length : 0;
  return {
    title: `German Reading Practice ${up} — ${n} Short Stories with English | SprachDost`,
    description: `Free German ${up} reading practice: short stories with English translation line by line, vocabulary and comprehension quizzes.`,
  };
}

export default async function StoriesLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const up = await validLevel(level);
  if (!up) notFound();
  const stories = loadStoriesForLevel(up);

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-3xl mx-auto w-full">
      <Link href="/" className="self-start text-sm opacity-70 hover:opacity-100 mb-6">← SprachDost</Link>
      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2">German Stories — Level {up}</h1>
      <p className="opacity-70 text-center text-sm mb-10">{stories.length} stories with English under every German line. Start reading — it&#39;s free.</p>

      <div className="w-full grid gap-2 mb-10">
        {stories.map((s) => (
          <Link
            key={s.id}
            href={`/lesen/${up.toLowerCase()}/${s.slug}`}
            className="glass rounded-xl px-5 py-4 flex items-center justify-between hover:border-amber-400/40 transition-all"
          >
            <span className="font-semibold text-sm">{s.title}</span>
            <span className="text-xs opacity-50">{s.paragraphs.length} lines →</span>
          </Link>
        ))}
      </div>

      <PublicCta />
    </main>
  );
}
