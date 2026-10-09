"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { speakSmart, loadVoices } from "@/lib/speech";
import { pushProgressToCloud } from "@/lib/supabase";

type Q = { q: string; options: string[]; answer: number; why?: string; level: string };
type Topic = { id: string; questions: { q: string; options: string[]; answer: number; why?: string }[] };

const BANDS: { level: string; count: number }[] = [
  { level: "A1", count: 18 },
  { level: "A2", count: 18 },
  { level: "B1", count: 9 },
];
const TOTAL = BANDS.reduce((n, b) => n + b.count, 0); // 45
const RESULT_KEY = "sprachdost_placement";

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function PlacementPage() {
  const [phase, setPhase] = useState<"intro" | "test" | "done">("intro");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, { c: number; n: number }>>({});
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem(RESULT_KEY);
        if (saved) setResult(JSON.parse(saved).level);
      } catch { /* noop */ }
    });
  }, []);

  const buildTest = useCallback(async () => {
    const all: Q[] = [];
    for (const band of BANDS) {
      try {
        const res = await fetch(`/grammar/${band.level}.json`);
        if (!res.ok) continue;
        const topics = (await res.json()) as Topic[];
        const pool = shuffle(topics.flatMap((t) => t.questions)).slice(0, band.count);
        all.push(...pool.map((q) => ({ ...q, level: band.level })));
      } catch { /* level pack missing — skip */ }
    }
    return all;
  }, []);

  const start = useCallback(async () => {
    loadVoices();
    const qs = await buildTest();
    if (qs.length === 0) { alert("Question banks not ready yet — try the Grammar section first."); return; }
    setQuestions(qs);
    setIdx(0);
    setPicked(null);
    setScores({});
    setPhase("test");
  }, [buildTest]);

  const pick = useCallback((i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const q = questions[idx];
    setScores((s) => {
      const band = s[q.level] ?? { c: 0, n: 0 };
      return { ...s, [q.level]: { c: band.c + (i === q.answer ? 1 : 0), n: band.n + 1 } };
    });
  }, [picked, questions, idx]);

  const next = useCallback(() => {
    if (idx + 1 >= questions.length) {
      // recommend the highest band the user passed (>=60%), else A1
      let rec = "A1";
      for (const band of BANDS) {
        const s = scores[band.level];
        if (s && s.n > 0 && s.c / s.n >= 0.6) rec = band.level;
        else break; // must pass lower band to place into the next
      }
      setResult(rec);
      try {
        localStorage.setItem(RESULT_KEY, JSON.stringify({ level: rec, scores, when: Date.now() }));
        pushProgressToCloud();
      } catch { /* noop */ }
      setPhase("done");
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  }, [idx, questions, scores]);

  const retake = useCallback(() => {
    localStorage.removeItem(RESULT_KEY);
    setResult(null);
    setPhase("intro");
  }, []);

  /* ─── done ─── */
  if (phase === "done" && result) {
    const desc: Record<string, string> = {
      A1: "Start with the basics — greetings, present tense, everyday words.",
      A2: "You know the fundamentals — time for past tense, dative and real conversations.",
      B1: "Strong base! Work on opinions, Konjunktiv II and fluent storytelling.",
    };
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-2xl mx-auto w-full text-center">
        <div className="text-6xl mb-4">🧭</div>
        <h1 className="text-3xl font-extrabold mb-2">You should start at <span className="text-amber-300">{result}</span></h1>
        <p className="opacity-70 mb-6">{desc[result]}</p>
        <div className="grid grid-cols-3 gap-3 w-full mb-8">
          {BANDS.map((b) => {
            const s = scores[b.level];
            return (
              <div key={b.level} className="glass rounded-xl p-3">
                <div className="text-lg font-extrabold text-amber-300">{b.level}</div>
                <div className="text-sm opacity-70">{s ? `${s.c}/${s.n}` : "—"}</div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href={`/grammar`} className="btn-primary text-sm">📐 Grammar at {result}</Link>
          <Link href={`/vocab`} className="btn-ghost text-sm">📇 Flashcards at {result}</Link>
          <button onClick={retake} className="btn-ghost text-sm">🔁 Retake</button>
        </div>
      </main>
    );
  }

  /* ─── test ─── */
  if (phase === "test" && questions.length) {
    const q = questions[idx];
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="w-full flex items-center justify-between mb-6">
          <button onClick={() => setPhase("intro")} className="text-sm opacity-70 hover:opacity-100">← Quit</button>
          <div className="text-sm opacity-70">{idx + 1} / {questions.length}</div>
          <div className="text-xs px-2 py-1 rounded-full bg-white/10">Level band: {q.level}</div>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div className="h-full german-gradient rounded-full transition-all" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <div className="glass rounded-3xl w-full p-6 md:p-8">
          <div className="flex items-start justify-between gap-3 mb-6">
            <h2 className="text-xl md:text-2xl font-bold leading-snug">{q.q}</h2>
            <span
              onClick={() => speakSmart(q.q.replace(/___+/g, "…"), "de-DE", { genderHint: "anna" })}
              className="glass rounded-full px-3 py-1.5 text-xs hover:bg-white/10 cursor-pointer shrink-0"
              role="button" aria-label="Hear the sentence"
            >🔊</span>
          </div>
          <div className="grid gap-3">
            {q.options.map((opt, i) => {
              let cls = "glass hover:border-amber-400/50";
              if (picked !== null) {
                if (i === q.answer) cls = "border-emerald-400/70 bg-emerald-500/15";
                else if (i === picked) cls = "border-red-400/70 bg-red-500/15";
                else cls = "opacity-40";
              }
              return (
                <button
                  key={i}
                  onClick={() => pick(i)}
                  disabled={picked !== null}
                  className={`rounded-xl border border-white/10 px-4 py-3 text-left font-semibold transition-all ${cls}`}
                >
                  <span className="opacity-50 mr-2">{["A","B","C","D"][i]}.</span>{opt}
                  {picked !== null && i === q.answer && <span className="ml-2">✅</span>}
                  {picked !== null && i === picked && i !== q.answer && <span className="ml-2">❌</span>}
                </button>
              );
            })}
          </div>
          {picked !== null && q.why && (
            <div className="mt-4 text-sm opacity-80 bg-white/5 rounded-xl px-4 py-3">💡 {q.why}</div>
          )}
          {picked !== null && (
            <button onClick={next} className="btn-primary w-full mt-4 !py-3">
              {idx + 1 >= questions.length ? "See my level →" : "Next →"}
            </button>
          )}
        </div>
      </main>
    );
  }

  /* ─── intro ─── */
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full text-center">
      <Link href="/practice" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100">← Back</Link>
      <div className="text-6xl mb-4">🧭</div>
      <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Placement Test</h1>
      <p className="opacity-70 mb-2">
        Not sure where to start? Answer <b>{TOTAL} quick questions</b> (A1 → A2 → B1, getting harder)
        and we&apos;ll recommend your level.
      </p>
      <p className="text-xs opacity-50 mb-8">~5 minutes • no typing, just tap • result saved on this device</p>

      {result ? (
        <div className="glass rounded-2xl p-6 w-full mb-6">
          <p className="text-sm opacity-70 mb-2">Your saved result:</p>
          <p className="text-3xl font-extrabold text-amber-300 mb-4">{result}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/grammar" className="btn-primary text-sm">Start learning →</Link>
            <button onClick={retake} className="btn-ghost text-sm">🔁 Retake</button>
          </div>
        </div>
      ) : (
        <button onClick={start} className="btn-primary !py-4 !px-10">Start the test →</button>
      )}
    </main>
  );
}
