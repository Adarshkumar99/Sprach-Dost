import type { Metadata } from "next";
import Link from "next/link";
import { SEO_LEVELS, loadGrammarForLevel } from "@/lib/seoData";
import PublicCta from "@/components/PublicCta";

export const metadata: Metadata = {
  title: "German Grammar Lessons — A1 to C1 (Goethe Syllabus) | SprachDost",
  description:
    "Every German grammar topic from A1 to C1 explained in simple English — der/die/das, cases, word order, Konjunktiv and more. Free lessons with examples, tables and practice questions.",
};

export default function GrammarHubPage() {
  const levels = SEO_LEVELS.map((level) => ({ level, topics: loadGrammarForLevel(level) }));
  const total = levels.reduce((n, l) => n + l.topics.length, 0);

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-3xl mx-auto w-full">
      <Link href="/" className="self-start text-sm opacity-70 hover:opacity-100 mb-6">← SprachDost</Link>
      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-3">German Grammar — {total} Free Lessons (A1–C1)</h1>
      <p className="opacity-70 text-center text-sm mb-10 max-w-xl">
        The complete Goethe syllabus, explained in simple English with examples and tables. Every lesson has practice
        questions — tap any topic to start reading.
      </p>

      {levels.map(({ level, topics }) =>
        topics.length === 0 ? null : (
          <section key={level} className="w-full mb-10">
            <h2 className="text-xl font-extrabold mb-3">
              Level {level} <span className="text-sm font-normal opacity-50">({topics.length} topics)</span>
            </h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {topics.map((t) => (
                <Link
                  key={t.id}
                  href={`/grammatik/${level.toLowerCase()}/${t.id}`}
                  className="glass rounded-xl px-4 py-3 text-sm font-semibold hover:border-amber-400/40 transition-all"
                >
                  {t.title}
                </Link>
              ))}
            </div>
          </section>
        )
      )}

      <PublicCta />
    </main>
  );
}
