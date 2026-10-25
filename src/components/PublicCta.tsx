import Link from "next/link";

/** conversion block at the bottom of every public SEO page */
export default function PublicCta({ text }: { text?: string }) {
  return (
    <div className="glass rounded-3xl w-full p-6 mt-10 border border-amber-400/40 text-center">
      <div className="font-extrabold text-lg mb-1">Learn German by SPEAKING — free 🇩🇪</div>
      <p className="text-sm opacity-70 mb-4">
        {text ?? "AI speaking partners, spaced-repetition vocab, full Goethe-style mock exams."}
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <Link href="/" className="btn-primary text-sm !py-3 !px-7">
          🚀 Start free — no card needed
        </Link>
        <Link href="/placement" className="btn-ghost text-sm !py-3 !px-7">
          🧭 Find my level (5 min)
        </Link>
      </div>
    </div>
  );
}
