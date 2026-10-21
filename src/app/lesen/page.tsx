import type { Metadata } from "next";
import Link from "next/link";
import { loadStoriesForLevel } from "@/lib/seoData";
import PublicCta from "@/components/PublicCta";

export const metadata: Metadata = {
  title: "German Reading Practice — Short Stories with English Translation (A1–C1) | SprachDost",
  description:
    "Learn German by reading: short stories for every level with English under each German line, vocabulary lists and comprehension quizzes. Free.",
};

export default function LesenHubPage() {
  const levels = ["A1", "A2", "B1", "B2", "C1"].map((level) => ({
    level,
    stories: loadStoriesForLevel(level as "A1"),
  }));

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-3xl mx-auto w-full">
      <Link href="/" className="self-start text-sm opacity-70 hover:opacity-100 mb-6">← SprachDost</Link>
      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-3">Learn German by Reading — Free Stories</h1>
      <p className="opacity-70 text-center text-sm mb-10 max-w-xl">
        Short German stories for every CEFR level — English translation under every line, key vocabulary and a quiz.
        Pick your level and start reading.
      </p>

      <div className="w-full grid sm:grid-cols-2 gap-3 mb-10">
        {levels.map(({ level, stories }) =>
          stories.length === 0 ? null : (
            <Link
              key={level}
              href={`/lesen/${level.toLowerCase()}`}
              className="glass rounded-2xl p-5 text-left hover:border-amber-400/40 transition-all"
            >
              <div className="font-extrabold text-lg">Level {level}</div>
              <div className="text-xs opacity-60">{stories.length} stories with audio 🔊</div>
            </Link>
          )
        )}
      </div>

      <PublicCta />
    </main>
  );
}
