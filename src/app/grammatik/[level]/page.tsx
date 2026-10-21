import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SEO_LEVELS, loadGrammarForLevel, type SeoLevel } from "@/lib/seoData";
import PublicCta from "@/components/PublicCta";

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_LEVELS.map((level) => ({ level: level.toLowerCase() }));
}

async function validLevel(level: string): Promise<SeoLevel | null> {
  const up = level.toUpperCase() as SeoLevel;
  return SEO_LEVELS.includes(up) && loadGrammarForLevel(up).length > 0 ? up : null;
}

export async function generateMetadata({ params }: { params: Promise<{ level: string }> }): Promise<Metadata> {
  const { level } = await params;
  const up = await validLevel(level);
  return {
    title: `German ${up} Grammar Topics — All ${up ? loadGrammarForLevel(up).length : 0} Lessons | SprachDost`,
    description: `All German ${up} grammar topics in one place: lessons in simple English, examples, tables and free practice questions.`,
  };
}

export default async function GrammarLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const up = await validLevel(level);
  if (!up) notFound();
  const topics = loadGrammarForLevel(up);

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-3xl mx-auto w-full">
      <Link href="/grammatik" className="self-start text-sm opacity-70 hover:opacity-100 mb-6">← All levels</Link>
      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-3">German {up} Grammar — {topics.length} Lessons</h1>
      <p className="opacity-70 text-center text-sm mb-10">
        Complete Goethe {up} syllabus. Open any topic for the full lesson + free practice questions.
      </p>

      <div className="w-full grid sm:grid-cols-2 gap-2 mb-10">
        {topics.map((t) => (
          <Link
            key={t.id}
            href={`/grammatik/${up.toLowerCase()}/${t.id}`}
            className="glass rounded-xl px-4 py-3 text-sm font-semibold hover:border-amber-400/40 transition-all"
          >
            {t.title}
          </Link>
        ))}
      </div>

      <PublicCta text={`Master ${up} grammar, then prove it in a full ${up} mock exam — free on SprachDost.`} />
    </main>
  );
}
