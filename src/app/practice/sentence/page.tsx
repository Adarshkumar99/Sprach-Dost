"use client";

/**
 * Satz-Baukasten — sentence-building exercise (Loecsen-style).
 * Scrambled German sentence → tap the words in the right order.
 * Sentences come from the vocab bank's example sentences; results feed the SRS.
 */

import Link from "next/link";
import BackLink from "@/components/BackLink";
import { useCallback, useMemo, useState } from "react";
import { wordsForLevel } from "@/lib/vocabStore";
import { vocabId, type VocabWord } from "@/lib/vocab";
import { norm, speakSmart, loadVoices } from "@/lib/speech";
import { gradeCard } from "@/lib/srs";
import { recordSession } from "@/lib/progress";
import { recordWeekly } from "@/lib/weekly";

type Level = "A1" | "A2" | "B1" | "B2";
const SESSION_SIZE = 12;

type Round = { word: VocabWord; tokens: string[] };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tokenize(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean);
}

export default function SentencePage() {
  const [phase, setPhase] = useState<"setup" | "play" | "done">("setup");
  const [level, setLevel] = useState<Level>("A1");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [rIdx, setRIdx] = useState(0);
  const [built, setBuilt] = useState<number[]>([]); // indexes into tokens
  const [checked, setChecked] = useState<null | { correct: boolean[]; pct: number; grade: number }>(null);
  const [score, setScore] = useState({ correctFirst: 0, attempted: 0 });
  const [loading, setLoading] = useState(false);

  const round = rounds[rIdx];

  const startLevel = useCallback(async (l: Level) => {
    setLoading(true);
    try {
      const pool = (await wordsForLevel(l, "All")).filter(
        (w) => w.ex && tokenize(w.ex).length >= 4 && tokenize(w.ex).length <= 9
      );
      if (pool.length === 0) {
        setLoading(false);
        return;
      }
      const picked = shuffle(pool).slice(0, SESSION_SIZE).map((word) => ({
        word,
        tokens: tokenize(word.ex as string),
      }));
      setRounds(picked);
      setRIdx(0);
      setBuilt([]);
      setChecked(null);
      setScore({ correctFirst: 0, attempted: 0 });
      setLevel(l);
      loadVoices();
      setPhase("play");
    } finally {
      setLoading(false);
    }
  }, []);

  const target = round?.tokens ?? [];
  const chips = useMemo(
    () => (round ? shuffle(round.tokens.map((t, i) => ({ t, i }))) : []),
    // reshuffle only when a new round starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rIdx, rounds]
  );

  const check = () => {
    if (!round || checked || built.length === 0) return;
    // positional match: built[k] must be the index whose token equals target[k]
    const positional = built.map((idx, pos) => norm(target[idx]) === norm(target[pos]));
    const hits = positional.filter(Boolean).length;
    const pct = Math.round((hits / target.length) * 100);
    const grade = pct >= 100 ? 5 : pct >= 70 ? 4 : pct >= 50 ? 3 : 1;
    gradeCard(vocabId(round.word), grade);
    setChecked({ correct: positional, pct, grade });
    setScore((s) => ({ attempted: s.attempted + 1, correctFirst: s.correctFirst + (pct === 100 ? 1 : 0) }));
    speakSmart(round.tokens.join(" "), "de-DE", { rate: 0.85 });
  };

  const next = () => {
    if (rIdx + 1 >= rounds.length) {
      recordSession({ minutes: 6, words: rounds.length, level });
      recordWeekly({ minutes: 6 });
      setPhase("done");
      return;
    }
    setRIdx((i) => i + 1);
    setBuilt([]);
    setChecked(null);
  };

  /* ─── setup ─── */
  if (phase === "setup") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full text-center">
        <BackLink fallback="/practice" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100" />
        <div className="text-6xl mb-4">🧩</div>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Satz-Baukasten</h1>
        <p className="opacity-70 text-sm mb-8">
          Scrambled German sentences — tap the words in the right order. The fastest way to internalise German word order.
        </p>
        <div className="flex gap-2 mb-6">
          {(["A1", "A2", "B1", "B2"] as const).map((l) => (
            <button
              key={l}
              onClick={() => startLevel(l)}
              disabled={loading}
              className={`px-6 h-11 rounded-xl font-extrabold transition-all ${
                level === l ? "german-gradient text-black shadow-lg scale-105" : "glass opacity-60 hover:opacity-100"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {loading && <p className="text-sm opacity-60 animate-pulse">Loading sentences…</p>}
        <p className="text-xs opacity-50">Feeds your spaced-repetition deck. ~6 minutes.</p>
      </main>
    );
  }

  /* ─── done ─── */
  if (phase === "done") {
    const pct = Math.round((score.correctFirst / Math.max(1, score.attempted)) * 100);
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full text-center">
        <div className="text-6xl mb-4">{pct >= 80 ? "🏆" : pct >= 50 ? "💪" : "🧩"}</div>
        <h1 className="text-3xl font-extrabold mb-2">Session complete!</h1>
        <p className="opacity-70 text-sm mb-6">
          {score.correctFirst}/{score.attempted} sentences perfect ({pct}%) at level {level}.
        </p>
        <div className="flex gap-3">
          <button onClick={() => startLevel(level)} className="btn-primary text-sm">🔁 New round</button>
          <Link href="/practice" className="btn-ghost text-sm">← Practice hub</Link>
        </div>
      </main>
    );
  }

  /* ─── play ─── */
  if (!round) return null;
  const hint = round.word.exEn ?? round.word.en;

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
      <div className="w-full flex items-center justify-between mb-6">
        <Link href="/practice" className="text-sm opacity-70 hover:opacity-100">← Quit</Link>
        <div className="text-sm opacity-70">{rIdx + 1} / {rounds.length} • ✅ {score.correctFirst}</div>
        <div className="text-xs px-2 py-1 rounded-full bg-white/10">{level}</div>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full mb-8 overflow-hidden">
        <div className="h-full german-gradient rounded-full transition-all" style={{ width: `${(rIdx / rounds.length) * 100}%` }} />
      </div>

      <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
        <div className="text-xs font-bold tracking-widest opacity-60 mb-2">BUILD THE SENTENCE</div>
        <p className="text-sm opacity-80 mb-1">💬 {hint}</p>
        <p className="text-xs opacity-50 mb-4">Meaning of the key word: <b>{round.word.de}</b> — {round.word.en}</p>

        {/* built area */}
        <div className="min-h-[64px] rounded-xl bg-white/5 border border-white/10 p-3 mb-4 flex flex-wrap gap-1.5">
          {built.length === 0 && <span className="text-xs opacity-40 self-center">Tap the words below in the right order…</span>}
          {built.map((idx, pos) => {
            const verdict = checked ? (checked.correct[pos] ? "text-emerald-300" : "text-red-300 line-through") : "";
            return (
              <button
                key={`${idx}-${pos}`}
                onClick={() => {
                  if (checked) return;
                  setBuilt((b) => b.filter((_, k) => k !== pos));
                }}
                className={`glass rounded-lg px-3 py-1.5 text-sm font-semibold ${verdict} ${checked ? "cursor-default" : "hover:border-red-400/50"}`}
              >
                {round.tokens[idx]}
              </button>
            );
          })}
        </div>

        {/* chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {chips.map(({ t, i }) =>
            built.includes(i) ? (
              <span key={i} className="rounded-lg px-3 py-1.5 text-sm bg-white/5 opacity-20">{t}</span>
            ) : (
              <button
                key={i}
                onClick={() => {
                  if (checked) return;
                  setBuilt((b) => [...b, i]);
                }}
                className="glass rounded-lg px-3 py-1.5 text-sm font-semibold hover:border-amber-400/50 transition-all"
              >
                {t}
              </button>
            )
          )}
        </div>

        {!checked ? (
          <button onClick={check} disabled={built.length !== target.length} className="btn-primary w-full !py-4 disabled:opacity-40">
            {built.length !== target.length ? `Place all words (${built.length}/${target.length})` : "✅ Check"}
          </button>
        ) : (
          <div className="space-y-3">
            <div className={`rounded-xl px-4 py-3 text-sm ${checked.pct === 100 ? "bg-emerald-500/10 border border-emerald-400/40" : "bg-red-500/10 border border-red-400/40"}`}>
              <b>{checked.pct === 100 ? "Perfekt! 🎉" : `${checked.pct}% — correct order shown above`}</b>
              <div className="opacity-80 mt-1">✔ {target.join(" ")}</div>
              <div className="opacity-60 text-xs mt-1">SRS grade {checked.grade} applied to &ldquo;{round.word.de}&rdquo;</div>
            </div>
            <button onClick={next} className="btn-primary w-full !py-4">
              {rIdx + 1 >= rounds.length ? "See results →" : "Next sentence →"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
