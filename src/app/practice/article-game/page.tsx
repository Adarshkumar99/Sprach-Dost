"use client";

/**
 * Der/Die/Das Sprint — 60-second article game built from the vocab packs.
 * Wrong answers loop back later in the round; XP + quest progress awarded;
 * mistakes land in the Fehlerheft.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadNouns, shuffle, type Noun } from "@/lib/articles";
import { awardXp } from "@/lib/xp";
import { recordQuestActivity } from "@/lib/quests";
import { recordWeekly } from "@/lib/weekly";
import { addMistake } from "@/lib/mistakes";
import BackLink from "@/components/BackLink";

const ROUND_SECONDS = 60;
const ARTICLES = ["der", "die", "das"] as const;
type Art = (typeof ARTICLES)[number];

export default function ArticleGame() {
  const [phase, setPhase] = useState<"setup" | "play" | "over">("setup");
  const [best, setBest] = useState(0);
  const [nouns, setNouns] = useState<Noun[]>([]);
  const [cur, setCur] = useState<Noun | null>(null);
  const [picked, setPicked] = useState<Art | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueRef = useRef<Noun[]>([]);
  const missedRef = useRef<Noun[]>([]);
  const scoreRef = useRef(0);
  const lockRef = useRef(false);

  useEffect(() => {
    void (async () => {
      const b = Number(localStorage.getItem("sprachdost_article_best") ?? "0") || 0;
      setBest(b);
      const deck = await loadNouns();
      setNouns(deck);
    })();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const nextWord = useCallback(() => {
    if (queueRef.current.length === 0) {
      // rebuild: priority to missed words (in-game repetition)
      queueRef.current = shuffle(missedRef.current).concat(shuffle(nouns));
    }
    setPicked(null);
    lockRef.current = false;
    setCur(queueRef.current.shift() ?? null);
  }, [nouns]);

  const start = () => {
    if (nouns.length < 10) return;
    queueRef.current = shuffle(nouns);
    missedRef.current = [];
    scoreRef.current = 0;
    setScore(0); setStreak(0);
    setTimeLeft(ROUND_SECONDS);
    setPhase("play");
    setPicked(null);
    lockRef.current = false;
    setCur(queueRef.current.shift() ?? null);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          const final = scoreRef.current;
          setBest((b) => {
            if (final > b) {
              localStorage.setItem("sprachdost_article_best", String(final));
              return final;
            }
            return b;
          });
          setPhase("over");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const answer = (a: Art) => {
    if (lockRef.current || !cur) return;
    lockRef.current = true;
    setPicked(a);
    const correct = a === cur.article;
    if (correct) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setStreak((s) => s + 1);
      awardXp("game");
      recordQuestActivity("games", 1);
    } else {
      setStreak(0);
      missedRef.current.push(cur);
      addMistake({ wrong: `${cur.article} ${cur.noun} (you picked: ${a})`, note: `"${cur.noun}" is ${cur.article.toUpperCase()} — ${cur.en}`, context: "Der/Die/Das Sprint" });
    }
    recordWeekly({ games: correct ? 1 : 0 });
    setTimeout(nextWord, correct ? 350 : 900);
  };

  /* ── setup ── */
  if (phase === "setup") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full text-center">
        <BackLink fallback="/practice" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100" />
        <div className="text-6xl mb-4">🃏</div>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Der / Die / Das Sprint</h1>
        <p className="opacity-70 text-sm mb-6">
          60 seconds. See the noun → tap the right article. Wrong ones come back until you get them right.
        </p>
        <div className="glass rounded-3xl p-6 w-full max-w-sm space-y-3">
          <div className="flex justify-between text-sm"><span className="opacity-60">Best score</span><b>🏆 {best}</b></div>
          <div className="flex justify-between text-sm"><span className="opacity-60">Nouns in deck</span><b>{nouns.length.toLocaleString()}</b></div>
          <div className="flex justify-between text-sm"><span className="opacity-60">XP per correct answer</span><b>+1</b></div>
        </div>
        <button onClick={start} disabled={nouns.length < 10} className="btn-primary mt-6 !px-10 disabled:opacity-50">
          {nouns.length < 10 ? "Loading deck…" : "▶ Start 60s round"}
        </button>
      </main>
    );
  }

  /* ── over ── */
  if (phase === "over") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full text-center">
        <BackLink fallback="/practice" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100" />
        <div className="text-6xl mb-4">{score > 30 ? "🏆" : score > 15 ? "🎉" : "💪"}</div>
        <h1 className="text-4xl font-extrabold mb-1">{score} correct</h1>
        <p className="opacity-70 mb-6">Personal best: {best}</p>
        <div className="flex gap-3">
          <button onClick={start} className="btn-primary">🔄 Play again</button>
          <Link href="/practice" className="btn-ghost">← Practice hub</Link>
        </div>
      </main>
    );
  }

  /* ── play ── */
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full text-center">
      <div className="flex items-center justify-between w-full max-w-sm mb-6 text-sm">
        <span className="glass rounded-full px-3 py-1">⏱️ {timeLeft}s</span>
        <span className="glass rounded-full px-3 py-1 font-bold">{score} ✓</span>
        <span className="glass rounded-full px-3 py-1">🔥 {streak}</span>
      </div>

      {cur && (
        <>
          <div className="text-sm opacity-60 mb-2">{cur.en}</div>
          <div className="text-4xl md:text-5xl font-extrabold mb-10">{cur.noun}</div>
          <div className="flex gap-3 justify-center w-full max-w-sm">
            {ARTICLES.map((a) => {
              const isPicked = picked === a;
              const isCorrect = cur.article === a;
              let cls = "glass rounded-2xl py-5 text-xl font-extrabold flex-1 transition-all";
              if (picked) {
                if (isCorrect) cls += " !bg-emerald-500/30 !border-emerald-400";
                else if (isPicked) cls += " !bg-red-500/30 !border-red-400";
              }
              return (
                <button key={a} onClick={() => answer(a)} className={cls} disabled={!!picked}>
                  {a}
                </button>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
