"use client";

/**
 * Konjugation Sprint — 60-second verb conjugation game (present tense).
 * Deck: public/verbs.json (hand-verified seed). Wrong answers loop back;
 * XP + quest progress awarded; mistakes land in the Fehlerheft.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { awardXp } from "@/lib/xp";
import { recordQuestActivity } from "@/lib/quests";
import { recordWeekly } from "@/lib/weekly";
import { addMistake } from "@/lib/mistakes";
import BackLink from "@/components/BackLink";

const ROUND_SECONDS = 60;
const PRONOUNS = ["ich", "du", "er/sie", "wir", "ihr", "sie"] as const;
type Pronoun = (typeof PRONOUNS)[number];

type Verb = {
  inf: string;
  en: string;
  level: string;
  forms: Record<string, string>; // keys: ich, du, er, wir, ihr, sie
};

const PRONOUN_KEY: Record<Pronoun, string> = { ich: "ich", du: "du", "er/sie": "er", wir: "wir", ihr: "ihr", sie: "sie" };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Task = { verb: Verb; pronoun: Pronoun; answer: string; options: string[] };

function makeTask(verb: Verb, allForms: string[]): Task {
  const pronoun = PRONOUNS[Math.floor(Math.random() * PRONOUNS.length)];
  const answer = verb.forms[PRONOUN_KEY[pronoun]];
  const pool = [...new Set(Object.values(verb.forms))].filter((f) => f !== answer);
  const extra = shuffle(allForms.filter((f) => f !== answer && !pool.includes(f)));
  while (pool.length < 3 && extra.length) pool.push(extra.shift()!);
  const options = shuffle([answer, ...shuffle(pool).slice(0, 3)]);
  return { verb, pronoun, answer, options };
}

export default function VerbGame() {
  const [phase, setPhase] = useState<"setup" | "play" | "over">("setup");
  const [best, setBest] = useState(0);
  const [verbs, setVerbs] = useState<Verb[]>([]);
  const [task, setTask] = useState<Task | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueRef = useRef<Task[]>([]);
  const missedRef = useRef<Task[]>([]);
  const scoreRef = useRef(0);
  const lockRef = useRef(false);

  useEffect(() => {
    void (async () => {
      setBest(Number(localStorage.getItem("sprachdost_verb_best") ?? "0") || 0);
      try {
        const res = await fetch("/verbs.json");
        const arr: Verb[] = await res.json();
        if (Array.isArray(arr)) setVerbs(arr.filter((v) => v?.inf && v?.forms));
      } catch { /* deck missing — setup stays disabled */ }
    })();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const allForms = verbs.flatMap((v) => Object.values(v.forms));

  const nextTask = useCallback(() => {
    if (queueRef.current.length === 0) {
      const missed = missedRef.current;
      const source: Verb[] = missed.length > 0 ? missed.map((t) => t.verb) : verbs;
      queueRef.current = shuffle(source).map((v) => makeTask(v, allForms));
    }
    setPicked(null);
    lockRef.current = false;
    setTask(queueRef.current.shift() ?? null);
  }, [verbs, allForms]);

  const start = () => {
    if (verbs.length < 8) return;
    missedRef.current = [];
    scoreRef.current = 0;
    queueRef.current = shuffle(verbs).map((v) => makeTask(v, allForms));
    setScore(0); setStreak(0); setTimeLeft(ROUND_SECONDS);
    setPhase("play");
    setPicked(null);
    lockRef.current = false;
    setTask(queueRef.current.shift() ?? null);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          const final = scoreRef.current;
          setBest((b) => {
            if (final > b) {
              localStorage.setItem("sprachdost_verb_best", String(final));
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

  const answer = (opt: string) => {
    if (lockRef.current || !task) return;
    lockRef.current = true;
    setPicked(opt);
    const correct = opt === task.answer;
    if (correct) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setStreak((s) => s + 1);
      awardXp("game");
      recordQuestActivity("games", 1);
    } else {
      setStreak(0);
      missedRef.current.push(task);
      addMistake({
        wrong: `${task.pronoun} ${opt} (von ${task.verb.inf})`,
        note: `${task.pronoun === "ich" ? "Ich" : task.pronoun} ${task.answer} — ${task.verb.en}`,
        context: "Konjugation Sprint",
      });
    }
    recordWeekly({ games: correct ? 1 : 0 });
    setTimeout(nextTask, correct ? 350 : 900);
  };

  /* ── setup ── */
  if (phase === "setup") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full text-center">
        <BackLink fallback="/practice" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100" />
        <div className="text-6xl mb-4">⚡</div>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Konjugation Sprint</h1>
        <p className="opacity-70 text-sm mb-6">
          60 seconds. Pronoun + verb → pick the correct present-tense form. Stem-changers included!
        </p>
        <div className="glass rounded-3xl p-6 w-full max-w-sm space-y-3">
          <div className="flex justify-between text-sm"><span className="opacity-60">Best score</span><b>🏆 {best}</b></div>
          <div className="flex justify-between text-sm"><span className="opacity-60">Verbs in deck</span><b>{verbs.length}</b></div>
          <div className="flex justify-between text-sm"><span className="opacity-60">XP per correct answer</span><b>+1</b></div>
        </div>
        <button onClick={start} disabled={verbs.length < 8} className="btn-primary mt-6 !px-10 disabled:opacity-50">
          {verbs.length < 8 ? "Loading verbs…" : "▶ Start 60s round"}
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

      {task && (
        <>
          <div className="text-sm opacity-60 mb-2">{task.verb.inf} — {task.verb.en}</div>
          <div className="text-4xl md:text-5xl font-extrabold mb-10">{task.pronoun} ___</div>
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {task.options.map((opt) => {
              const isPicked = picked === opt;
              const isCorrect = task.answer === opt;
              let cls = "glass rounded-2xl py-4 text-lg font-bold transition-all";
              if (picked) {
                if (isCorrect) cls += " !bg-emerald-500/30 !border-emerald-400";
                else if (isPicked) cls += " !bg-red-500/30 !border-red-400";
              }
              return (
                <button key={opt} onClick={() => answer(opt)} className={cls} disabled={!!picked}>
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
