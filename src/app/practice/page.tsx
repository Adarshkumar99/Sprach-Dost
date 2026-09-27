import Link from "next/link";
import Avatar from "@/components/Avatar";

export default function Practice() {
  return (
    <main className="flex flex-col min-h-screen items-center justify-center px-6 py-14">
      <Link href="/" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100">← Home</Link>

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
      </div>

      <p className="mt-10 text-xs opacity-50 text-center max-w-md">
        💡 Tip: For the best voice quality use Chrome or Edge, and allow microphone permission when asked.
      </p>
    </main>
  );
}
