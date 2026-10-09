import Link from "next/link";
import Avatar from "@/components/Avatar";
import ProgressCard from "@/components/ProgressCard";
import AuthButton from "@/components/AuthButton";

export default function Practice() {
  return (
    <main className="flex flex-col min-h-screen items-center justify-center px-6 py-14">
      <Link href="/" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100">← Home</Link>
      <div className="absolute top-6 right-6"><AuthButton /></div>

      <h1 className="text-3xl md:text-5xl font-extrabold text-center mb-3">
        Who do you want to practice with? 🤔
      </h1>
      <p className="opacity-70 mb-12 text-center">Pick your German practice partner</p>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Link
          href="/practice/anna"
          className="glass rounded-3xl p-10 flex flex-col items-center gap-4 hover:scale-[1.02] hover:border-amber-400/50 transition-all"
        >
          <Avatar variant="anna" size={200} name="Anna" />
          <div className="text-center">
            <div className="font-bold text-xl mb-1">🗣️ Anna — Sprechen!</div>
            <p className="text-sm opacity-70">
              <b>55 real-life scenarios</b> — café, airport, hotel, job interview, Goethe exam prep.
              Voice conversation with gentle corrections. Pick your partner avatar too!
            </p>
          </div>
          <span className="btn-primary text-sm mt-2">Pick a scenario →</span>
        </Link>

        <Link
          href="/practice/lehrer"
          className="glass rounded-3xl p-10 flex flex-col items-center gap-4 hover:scale-[1.02] hover:border-blue-400/50 transition-all"
        >
          <Avatar variant="jonas" size={200} name="Jonas" />
          <div className="text-center">
            <div className="font-bold text-xl mb-1">👨‍🏫 Lehrer — Nach Thema!</div>
            <p className="text-sm opacity-70">
              <b>YOU pick the topic.</b> Lehrer teaches it natively at your level (A1–C2),
              explains grammar in simple English, and gives feedback. Choose your teacher avatar.
            </p>
          </div>
          <span className="btn-primary text-sm mt-2">Pick a topic →</span>
        </Link>

        <Link
          href="/vocab"
          className="md:col-span-2 glass rounded-3xl p-8 flex flex-col sm:flex-row items-center gap-6 hover:scale-[1.01] hover:border-emerald-400/50 transition-all"
        >
          <div className="text-6xl">📇</div>
          <div className="text-center sm:text-left flex-1">
            <div className="font-bold text-xl mb-1">Vocabulary Trainer — Flashcards + Spaced Repetition</div>
            <p className="text-sm opacity-70">
              A1 (1,000) • A2 (1,500) • B1 (2,000) words with meanings & example sentences.
              Cards come back right before you forget them — that&apos;s how they stick. 🔊 Audio for every word.
              Continue where you left off — progress saves after every card.
            </p>
          </div>
          <span className="btn-primary text-sm whitespace-nowrap">Start training →</span>
        </Link>

        <Link
          href="/grammar"
          className="md:col-span-2 glass rounded-3xl p-8 flex flex-col sm:flex-row items-center gap-6 hover:scale-[1.01] hover:border-blue-400/50 transition-all"
        >
          <div className="text-6xl">📐</div>
          <div className="text-center sm:text-left flex-1">
            <div className="font-bold text-xl mb-1">Grammar Lessons — Goethe Syllabus A1•A2•B1</div>
            <p className="text-sm opacity-70">
              Every grammar topic from der/die/das to Konjunktiv II — short lesson in simple English,
              then a hand-checked quiz. <b>1,000+ questions</b> with instant explanations.
            </p>
          </div>
          <span className="btn-primary text-sm whitespace-nowrap">Start learning →</span>
        </Link>

        <Link
          href="/placement"
          className="md:col-span-2 glass rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-5 hover:scale-[1.01] hover:border-purple-400/50 transition-all"
        >
          <div className="text-5xl">🧭</div>
          <div className="text-center sm:text-left flex-1">
            <div className="font-bold text-lg mb-1">Not sure of your level? — Placement Test</div>
            <p className="text-sm opacity-70">
              45 quick tap-to-answer questions (A1 → B1). ~5 minutes, no typing — we tell you exactly where to start.
            </p>
          </div>
          <span className="btn-ghost text-sm whitespace-nowrap">Take the test →</span>
        </Link>
      </div>

      <p className="mt-10 text-xs opacity-50 text-center max-w-md">
        💡 Tip: For the best voice quality use Chrome or Edge, and allow microphone permission when asked.
      </p>

      <ProgressCard />
    </main>
  );
}
