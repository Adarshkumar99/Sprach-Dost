"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { speak, loadVoices } from "@/lib/speech";
import { vocabId, type VocabWord } from "@/lib/vocab";
import { loadAllWords, topicsOfLevel, wordsForLevel } from "@/lib/vocabStore";
import { gradeCard, fullStats, dueCards, isNew } from "@/lib/srs";
import { recordSession } from "@/lib/progress";

type Phase = "setup" | "session" | "done";
type Mode = "learn" | "review";
const LEVELS = ["A1", "A2", "B1"] as const;
const LEVEL_COLORS: Record<string, string> = { A1: "lvl-a1", A2: "lvl-a2", B1: "lvl-b1" };

export default function VocabPage() {
  /* setup state */
  const [phase, setPhase] = useState<Phase>("setup");
  const [level, setLevel] = useState<string>("A1");
  const [topics, setTopics] = useState<string[]>([]);
  const [topic, setTopic] = useState<string>("All");
  const [mode, setMode] = useState<Mode>("learn");
  const [stats, setStats] = useState({ learned: 0, due: 0, new: 0 });
  const [totalWords, setTotalWords] = useState(0);

  /* session state */
  const [deck, setDeck] = useState<VocabWord[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [gradedCount, setGradedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const startRef = useRef<number>(0);

  /* load words + topics + stats */
  useEffect(() => {
    let alive = true;
    (async () => {
      const all = await loadAllWords();
      if (!alive) return;
      setTotalWords(all.filter((w) => w.level === level).length);
      const tps = await topicsOfLevel(level);
      if (!alive) return;
      setTopics(tps);
      const pool = await wordsForLevel(level, "All");
      if (!alive) return;
      setStats(fullStats(pool.map(vocabId)));
    })();
    return () => {
      alive = false;
    };
  }, [level]);

  const startSession = useCallback(async (m: Mode) => {
    loadVoices(); // pre-warm voices on the click gesture
    const pool = await wordsForLevel(level, topic);
    let cards: VocabWord[];
    if (m === "review") {
      const dueIds = dueCards(pool.map(vocabId));
      cards = pool.filter((w) => dueIds.includes(vocabId(w)));
      if (cards.length === 0) {
        alert("No cards are due right now 🎉 — learn new words instead, or come back later!");
        return;
      }
    } else {
      // learn: fresh (unlearned) cards first
      const fresh = pool.filter((w) => isNew(vocabId(w)));
      cards = (fresh.length ? fresh : pool).slice(0, 10);
    }
    // shuffle lightly
    cards = [...cards].sort(() => Math.random() - 0.5);
    setMode(m);
    setDeck(cards);
    setIdx(0);
    setFlipped(false);
    setGradedCount(0);
    setCorrectCount(0);
    startRef.current = Date.now();
    setPhase("session");
  }, [level, topic]);

  const grade = useCallback((g: number) => {
    const card = deck[idx];
    if (!card) return;
    gradeCard(vocabId(card), g);
    if (g >= 3) setCorrectCount((c) => c + 1);
    const done = idx + 1 >= deck.length;
    setGradedCount((c) => c + 1);
    if (done) {
      const minutes = Math.max(1, Math.round((Date.now() - startRef.current) / 60000));
      recordSession({ minutes, words: correctCount + (g >= 3 ? 1 : 0), level });
      setPhase("done");
    } else {
      setIdx((i) => i + 1);
      setFlipped(false);
    }
  }, [deck, idx, correctCount, level]);

  const playAudio = useCallback((text: string) => {
    speak(text, "de-DE", { genderHint: "anna", rate: 0.9 });
  }, []);

  const card = deck[idx];

  /* ===================== UI ===================== */

  if (phase === "done") {
    const pct = gradedCount ? Math.round((correctCount / gradedCount) * 100) : 0;
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-2xl mx-auto w-full text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-extrabold mb-2">Session complete!</h1>
        <p className="opacity-70 mb-8">Level {level} • {mode === "learn" ? "New words" : "Review"}</p>
        <div className="grid grid-cols-3 gap-3 w-full mb-8">
          <Stat label="Cards" value={String(gradedCount)} icon="🃏" />
          <Stat label="Knew them" value={String(correctCount)} icon="✅" />
          <Stat label="Accuracy" value={`${pct}%`} icon="🎯" />
        </div>
        <div className="flex gap-3">
          <button onClick={() => setPhase("setup")} className="btn-primary !px-6 text-sm">📚 Another round</button>
          <Link href="/practice" className="btn-ghost text-sm">← Practice hub</Link>
        </div>
      </main>
    );
  }

  if (phase === "session" && card) {
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="w-full flex items-center justify-between mb-6">
          <button onClick={() => setPhase("setup")} className="text-sm opacity-70 hover:opacity-100">← Quit</button>
          <div className="text-sm opacity-70">{idx + 1} / {deck.length}</div>
          <div className="text-xs px-2 py-1 rounded-full bg-white/10">{mode === "learn" ? "📚 Learn" : "🔁 Review"}</div>
        </div>

        {/* progress bar */}
        <div className="w-full h-1.5 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div className="h-full german-gradient rounded-full transition-all" style={{ width: `${(idx / deck.length) * 100}%` }} />
        </div>

        {/* flip card */}
        <button
          onClick={() => setFlipped((f) => !f)}
          className="glass rounded-3xl w-full min-h-[300px] flex flex-col items-center justify-center gap-4 p-8 hover:scale-[1.01] transition-all"
        >
          {!flipped ? (
            <>
              <span className="text-xs tracking-widest opacity-50">GERMAN</span>
              <span className="text-3xl md:text-4xl font-extrabold text-amber-300 text-center">{card.de}</span>
              <span
                onClick={(e) => { e.stopPropagation(); playAudio(card.de); }}
                className="glass rounded-full px-4 py-2 text-sm hover:bg-white/10 cursor-pointer"
                role="button"
                aria-label="Play pronunciation"
              >
                🔊 Hear it
              </span>
              <span className="text-xs opacity-50 mt-4">Tap card to flip ↻</span>
            </>
          ) : (
            <>
              <span className="text-xs tracking-widest opacity-50">MEANING</span>
              <span className="text-2xl font-bold text-emerald-300 text-center">{card.en}</span>
              {card.ex && (
                <div className="mt-2 text-center">
                  <p className="text-base">{card.ex}</p>
                  {card.exEn && <p className="text-sm opacity-60 mt-1">{card.exEn}</p>}
                  <span
                    onClick={(e) => { e.stopPropagation(); playAudio(card.ex!); }}
                    className="inline-block mt-2 glass rounded-full px-3 py-1 text-xs hover:bg-white/10 cursor-pointer"
                    role="button"
                  >
                    🔊 Hear example
                  </span>
                </div>
              )}
            </>
          )}
        </button>

        {/* grade buttons */}
        <div className="grid grid-cols-4 gap-2 w-full mt-6">
          {flipped ? (
            <>
              <GradeBtn label="Again" sub="forgot 😵" tone="red" onClick={() => grade(1)} />
              <GradeBtn label="Hard" sub="barely 😅" tone="orange" onClick={() => grade(3)} />
              <GradeBtn label="Good" sub="knew it 🙂" tone="green" onClick={() => grade(4)} />
              <GradeBtn label="Easy" sub="too easy 😎" tone="blue" onClick={() => grade(5)} />
            </>
          ) : (
            <div className="col-span-4 text-center text-sm opacity-60">
              Flip the card, be honest with yourself, then grade.{" "}
              <span className="block text-xs mt-1">(Again/Hard cards come back sooner — that&apos;s how spaced repetition locks words into memory)</span>
            </div>
          )}
        </div>
      </main>
    );
  }

  /* ---------- setup ---------- */
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-14 max-w-2xl mx-auto w-full">
      <Link href="/practice" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100">← Back</Link>

      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2">📇 Vocabulary Trainer</h1>
      <p className="opacity-70 text-center text-sm mb-8">
        Flashcards + spaced repetition — words come back right before you forget them.
      </p>

      {/* level chips */}
      <div className="flex gap-2 mb-5">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => { setLevel(l); setTopic("All"); }}
            className={`px-5 h-10 rounded-xl font-extrabold transition-all ${
              level === l ? "german-gradient text-black shadow-lg scale-105" : "glass opacity-60 hover:opacity-100"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* stats row */}
      <div className="grid grid-cols-3 gap-2 w-full mb-6">
        <Stat label="Words in level" value={String(totalWords)} icon="📚" />
        <Stat label="Learned" value={String(stats.learned)} icon="✅" />
        <Stat label="Due for review" value={String(stats.due)} icon="🔁" />
      </div>

      {/* topic select */}
      <div className="w-full glass rounded-2xl p-4 mb-6">
        <div className="text-xs font-bold tracking-widest opacity-60 mb-2 text-center">TOPIC</div>
        <div className="flex gap-2 flex-wrap justify-center">
          {["All", ...topics].map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`rounded-full px-3 py-1.5 text-xs transition-all ${
                topic === t ? "german-gradient text-black font-bold" : "glass hover:border-amber-400/40 opacity-80"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* mode buttons */}
      <div className="flex gap-3 w-full">
        <button onClick={() => startSession("learn")} className="btn-primary flex-1 !py-4">
          📚 Learn new (10 cards)
        </button>
        <button onClick={() => startSession("review")} className="btn-ghost flex-1 !py-4">
          🔁 Review due ({stats.due})
        </button>
      </div>
      <p className="text-xs opacity-50 mt-4 text-center">
        Tip: 10 new words daily + reviews = &gt;2,000-word vocabulary in a few months 🚀
      </p>
    </main>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="glass rounded-xl p-3 text-center">
      <div className="text-lg font-extrabold text-amber-300">{icon} {value}</div>
      <div className="text-[11px] opacity-60">{label}</div>
    </div>
  );
}

function GradeBtn({ label, sub, tone, onClick }: { label: string; sub: string; tone: string; onClick: () => void }) {
  const styles: Record<string, string> = {
    red: "bg-red-500/15 border-red-400/40 hover:bg-red-500/25 text-red-300",
    orange: "bg-orange-500/15 border-orange-400/40 hover:bg-orange-500/25 text-orange-300",
    green: "bg-emerald-500/15 border-emerald-400/40 hover:bg-emerald-500/25 text-emerald-300",
    blue: "bg-blue-500/15 border-blue-400/40 hover:bg-blue-500/25 text-blue-300",
  };
  return (
    <button onClick={onClick} className={`rounded-xl border px-2 py-3 transition-all ${styles[tone]}`}>
      <div className="font-bold text-sm">{label}</div>
      <div className="text-[10px] opacity-70">{sub}</div>
    </button>
  );
}
