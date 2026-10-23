"use client";

/**
 * Diktat — listen to a German sentence, type what you hear.
 * Trains listening + spelling in one; results feed the spaced-repetition engine.
 */

import Link from "next/link";
import BackLink from "@/components/BackLink";
import { useCallback, useEffect, useMemo, useState } from "react";
import { wordsForLevel } from "@/lib/vocabStore";
import { vocabId, type VocabWord } from "@/lib/vocab";
import { speakSmart, norm } from "@/lib/speech";
import { gradeCard } from "@/lib/srs";
import { recordWeekly } from "@/lib/weekly";

type Level = "A1" | "A2" | "B1";
type Check = {
  matched: boolean[]; // per target token
  targetTokens: string[];
  score: number; // 0-100
  grade: number; // SRS grade applied
};

function tokenize(s: string): string[] {
  return norm(s).split(" ").filter(Boolean);
}

/** align typed tokens against target tokens (LCS) → per-target matched flags */
function diffTokens(target: string[], typed: string[]): boolean[] {
  const n = target.length;
  const m = typed.length;
  const matched = new Array(n).fill(false);
  if (n === 0) return matched;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = target[i] === typed[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (target[i] === typed[j]) {
      matched[i] = true;
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return matched;
}

export default function DictationPage() {
  const [phase, setPhase] = useState<"setup" | "play">("setup");
  const [level, setLevel] = useState<Level>("A1");
  const [pool, setPool] = useState<VocabWord[]>([]);
  const [pos, setPos] = useState(0);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [typed, setTyped] = useState("");
  const [check, setCheck] = useState<Check | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);

  const word = pool[pos];

  const startLevel = useCallback(async (l: Level) => {
    setLoading(true);
    try {
      const candidates = (await wordsForLevel(l, "All")).filter((w) => w.ex && w.ex.trim().length > 0);
      // shuffle
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      setPool(candidates.slice(0, 50));
      setPos(0);
      setTyped("");
      setCheck(null);
      setPlays(0);
      setStreak(0);
      setLevel(l);
      setPhase("play");
    } finally {
      setLoading(false);
    }
  }, []);

  const play = useCallback(() => {
    const text = word?.ex;
    if (!text || playing || plays >= 3) return;
    setPlays((n) => n + 1);
    setPlaying(true);
    speakSmart(text, "de-DE", { rate: 0.82, onEnd: () => setPlaying(false) });
  }, [word, playing, plays]);

  /* auto-play on new word */
  useEffect(() => {
    if (phase !== "play" || !word) return;
    const t = setTimeout(() => play(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pos, word?.de]);

  const targetTokens = useMemo(() => (word ? tokenize(word.ex ?? "") : []), [word]);

  const doCheck = () => {
    if (!word || !typed.trim()) return;
    const matched = diffTokens(targetTokens, tokenize(typed));
    const hits = matched.filter(Boolean).length;
    const score = Math.round((hits / Math.max(1, targetTokens.length)) * 100);
    const grade = score >= 90 ? 5 : score >= 70 ? 4 : score >= 50 ? 3 : 1;
    gradeCard(vocabId(word), grade);
    recordWeekly({ dictation: 1 });
    setCheck({ matched, targetTokens, score, grade });
    if (score >= 70) setStreak((s) => s + 1);
    else setStreak(0);
  };

  const next = () => {
    setPos((p) => p + 1);
    setTyped("");
    setCheck(null);
    setPlays(0);
  };

  /* ─── setup ─── */
  if (phase === "setup") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full text-center">
        <BackLink fallback="/practice" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100" />
        <div className="text-6xl mb-4">🎧</div>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Diktat — Dictation</h1>
        <p className="opacity-70 text-sm mb-8">
          Hear a German sentence → type exactly what you hear. Trains listening + spelling, and feeds your spaced-repetition deck.
        </p>
        <div className="flex gap-2 mb-6">
          {(["A1", "A2", "B1"] as const).map((l) => (
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
        {loading && <p className="text-sm opacity-60">Loading word bank…</p>}
        <p className="text-xs opacity-50">Requires sound on. Best in Chrome or Edge.</p>
      </main>
    );
  }

  /* ─── finished the pool ─── */
  if (!word) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-extrabold mb-2">Runde beendet!</h1>
        <p className="opacity-70 text-sm mb-6">You finished 50 dictations at {level}. Current streak: {streak} ✅</p>
        <div className="flex gap-3">
          <button onClick={() => startLevel(level)} className="btn-primary text-sm">🔁 New round</button>
          <Link href="/practice" className="btn-ghost text-sm">← Practice hub</Link>
        </div>
      </main>
    );
  }

  /* ─── play ─── */
  const done = !!check;
  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
      <div className="w-full flex items-center justify-between mb-6">
        <Link href="/practice" className="text-sm opacity-70 hover:opacity-100">← Quit</Link>
        <div className="text-sm opacity-70">
          {pos + 1} / {pool.length} • 🔥 {streak}
        </div>
        <div className="text-xs px-2 py-1 rounded-full bg-white/10">{level} Diktat</div>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full mb-8 overflow-hidden">
        <div className="h-full german-gradient rounded-full transition-all" style={{ width: `${(pos / pool.length) * 100}%` }} />
      </div>

      <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6 text-center">
        <div className="text-xs font-bold tracking-widest opacity-60 mb-4">LISTEN & TYPE</div>
        <button
          onClick={play}
          disabled={playing || plays >= 3}
          className="btn-primary !py-3 !px-8 text-sm disabled:opacity-50"
        >
          {playing ? "🔊 Playing…" : plays === 0 ? "▶ Play sentence" : `🔊 Replay (${3 - plays} left)`}
        </button>
        <p className="text-xs opacity-50 mt-3">Max 3 plays. Type the full sentence in German.</p>
      </div>

      <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !done) doCheck();
            if (e.key === "Enter" && done) next();
          }}
          disabled={done}
          placeholder="Schreiben Sie den Satz hier…"
          autoFocus
          className="w-full rounded-xl bg-white/5 border border-white/10 p-4 text-[15px] outline-none focus:border-yellow-400/50 disabled:opacity-70"
        />

        {check && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-extrabold german-gradient-text">{check.score}%</span>
              <span className="text-xs opacity-60">
                {check.grade >= 5 ? "Perfect! 🎉" : check.grade >= 4 ? "Good ✅" : check.grade >= 3 ? "Almost 💪" : "Keep practising 🔁"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 leading-relaxed">
              {check.targetTokens.map((tok, i) => (
                <span
                  key={i}
                  className={`px-1.5 py-0.5 rounded-md ${
                    check.matched[i] ? "text-emerald-300" : "bg-red-500/20 text-red-300 line-through decoration-red-400/60"
                  }`}
                >
                  {word.ex?.split(/\s+/)[i] ?? tok}
                </span>
              ))}
            </div>
            <p className="text-xs opacity-60 mt-3">
              💬 <b>{word.de}</b> — {word.en}
            </p>
          </div>
        )}

        {!check ? (
          <button onClick={doCheck} disabled={!typed.trim()} className="btn-primary w-full !py-4 mt-4 disabled:opacity-40">
            ✅ Check
          </button>
        ) : (
          <button onClick={next} className="btn-primary w-full !py-4 mt-4">
            Next sentence →
          </button>
        )}
      </div>

      <button
        onClick={next}
        className="text-xs opacity-50 hover:opacity-80"
      >
        Skip this one (no SRS grade) →
      </button>
    </main>
  );
}
