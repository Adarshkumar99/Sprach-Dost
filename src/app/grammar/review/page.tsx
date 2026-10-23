"use client";

/**
 * Grammar Review Session — a 10-minute SRS-driven refresher.
 * Picks due topics across levels → quick lesson recap + 5 questions each → re-grades SRS.
 */

import Link from "next/link";
import BackLink from "@/components/BackLink";
import { useCallback, useEffect, useState } from "react";
import { speakSmart, loadVoices } from "@/lib/speech";
import { gradeCard, getCardState } from "@/lib/srs";
import { recordSession } from "@/lib/progress";
import { pushProgressToCloud } from "@/lib/supabase";

type GrammarQuestion = { q: string; options: string[]; answer: number; why?: string };
type GrammarTopic = { id: string; title: string; lesson: string; questions: GrammarQuestion[] };

type ReviewItem = { level: string; topic: GrammarTopic; questions: GrammarQuestion[] };

type View =
  | { name: "loading" }
  | { name: "empty" }
  | { name: "brief"; item: ReviewItem; index: number; total: number }
  | { name: "quiz"; item: ReviewItem; index: number; total: number }
  | { name: "done"; graded: number; total: number };

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const TOPICS_PER_SESSION = 4;
const QUESTIONS_PER_TOPIC = 5;

export default function GrammarReviewPage() {
  const [view, setView] = useState<View>({ name: "loading" });
  const [session, setSession] = useState<ReviewItem[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [graded, setGraded] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const due: { level: string; topic: GrammarTopic }[] = [];
      for (const level of LEVELS) {
        try {
          const res = await fetch(`/grammar/${level}.json`);
          if (!res.ok) continue;
          const topics = (await res.json()) as GrammarTopic[];
          for (const t of topics) {
            const st = getCardState(`grammar|${level}|${t.id}`);
            // due = attempted before (has SRS state with reps) AND due timestamp passed
            if (st.reps > 0 && st.due <= Date.now()) due.push({ level, topic: t });
          }
        } catch { /* level missing */ }
        if (due.length >= TOPICS_PER_SESSION) break;
      }
      if (!alive) return;
      if (due.length === 0) {
        setView({ name: "empty" });
        return;
      }
      const pickedTopics = due.slice(0, TOPICS_PER_SESSION).map(({ level, topic }) => ({
        level,
        topic,
        questions: [...topic.questions].sort(() => Math.random() - 0.5).slice(0, Math.min(QUESTIONS_PER_TOPIC, topic.questions.length)),
      }));
      setSession(pickedTopics);
      setView({ name: "brief", item: pickedTopics[0], index: 0, total: pickedTopics.length });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const finishTopic = useCallback(
    (item: ReviewItem, correct: number, total: number) => {
      // re-grade the topic SRS card
      const pct = Math.round((correct / Math.max(1, total)) * 100);
      gradeCard(`grammar|${item.level}|${item.topic.id}`, pct >= 80 ? 5 : pct >= 60 ? 4 : pct >= 40 ? 3 : 1);
      pushProgressToCloud();
    },
    []
  );

  const next = useCallback(
    (item: ReviewItem, index: number, total: number) => {
      const totalQs = item.questions.length;
      finishTopic(item, correctCount, totalQs);
      setGraded((g) => g + correctCount);
      const nextIndex = index + 1;
      if (nextIndex >= total) {
        recordSession({ minutes: 8, words: 0, level: "Grammar Review" });
        setView({ name: "done", graded: graded + correctCount, total: session.reduce((n, s) => n + s.questions.length, 0) });
        return;
      }
      const item2 = session[nextIndex];
      setView({ name: "brief", item: item2, index: nextIndex, total });
      setQIdx(0);
      setPicked(null);
      setCorrectCount(0);
    },
    [correctCount, finishTopic, graded, session]
  );

  const pick = (i: number, q: GrammarQuestion) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) setCorrectCount((c) => c + 1);
  };

  /* ─── loading ─── */
  if (view.name === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="opacity-60 text-sm animate-pulse">Checking your due topics…</p>
      </main>
    );
  }

  /* ─── nothing due ─── */
  if (view.name === "empty") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full text-center">
        <BackLink fallback="/grammar" label="← Grammar" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100" />
        <div className="text-6xl mb-4">🌿</div>
        <h1 className="text-2xl font-extrabold mb-2">Nothing due right now</h1>
        <p className="opacity-70 text-sm mb-6">
          All your attempted grammar topics are fresh in memory. Take a new topic quiz — it&#39;ll come back here right before you forget it.
        </p>
        <Link href="/grammar" className="btn-primary text-sm">📐 Browse grammar topics →</Link>
      </main>
    );
  }

  /* ─── lesson brief ─── */
  if (view.name === "brief") {
    const { item, index, total } = view;
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="w-full flex items-center justify-between mb-6">
          <Link href="/grammar" className="text-sm opacity-70 hover:opacity-100">← Quit</Link>
          <div className="text-sm opacity-70">Topic {index + 1} / {total}</div>
          <div className="text-xs px-2 py-1 rounded-full bg-white/10">{item.level} Review</div>
        </div>
        <h1 className="text-2xl font-extrabold text-center mb-1">{item.topic.title}</h1>
        <p className="text-xs opacity-60 mb-6">Quick refresher, then {QUESTIONS_PER_TOPIC} questions</p>
        <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
          <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{item.topic.lesson}</p>
        </div>
        <button
          onClick={() => { loadVoices(); setView({ name: "quiz", item, index, total }); }}
          className="btn-primary !py-4 w-full"
        >
          📝 Quiz me ({item.questions.length} questions) →
        </button>
      </main>
    );
  }

  /* ─── quiz ─── */
  if (view.name === "quiz") {
    const { item, index, total } = view;
    const q = item.questions[qIdx];
    const isRight = picked === q.answer;
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="w-full flex items-center justify-between mb-6">
          <Link href="/grammar" className="text-sm opacity-70 hover:opacity-100">← Quit</Link>
          <div className="text-sm opacity-70">Topic {index + 1}/{total} • Q {qIdx + 1}/{item.questions.length}</div>
          <div className="text-xs px-2 py-1 rounded-full bg-white/10">{item.level}</div>
        </div>
        <div className="glass rounded-3xl w-full p-6 md:p-8">
          <div className="flex items-start justify-between gap-3 mb-6">
            <h2 className="text-xl font-bold leading-snug">{q.q}</h2>
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
                  onClick={() => pick(i, q)}
                  disabled={picked !== null}
                  className={`rounded-xl border border-white/10 px-4 py-3 text-left font-semibold transition-all ${cls}`}
                >
                  <span className="opacity-50 mr-2">{["A", "B", "C", "D"][i]}.</span>{opt}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div className="mt-5">
              <div className={`rounded-xl px-4 py-3 text-sm ${isRight ? "bg-emerald-500/10 border border-emerald-400/40" : "bg-red-500/10 border border-red-400/40"}`}>
                <b>{isRight ? "Richtig! 🎉 " : "Not quite. "}</b>{q.why}
              </div>
              <button
                onClick={() => {
                  if (qIdx + 1 >= item.questions.length) {
                    next(item, index, total);
                  } else {
                    setQIdx((i) => i + 1);
                    setPicked(null);
                  }
                }}
                className="btn-primary w-full mt-4 !py-3"
              >
                {qIdx + 1 >= item.questions.length ? "Finish topic →" : "Next question →"}
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  /* ─── done ─── */
  const { graded: g, total: t } = view;
  const pct = Math.round((g / Math.max(1, t)) * 100);
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full text-center">
      <div className="text-6xl mb-4">{pct >= 80 ? "🏆" : "💪"}</div>
      <h1 className="text-3xl font-extrabold mb-2">Review complete!</h1>
      <p className="opacity-70 text-sm mb-6">
        {g}/{t} correct across {session.length} due topics. They&#39;ll come back when you&#39;re about to forget them.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => {
            setGraded(0);
            setView({ name: "loading" });
            queueMicrotask(() => window.location.reload());
          }}
          className="btn-primary text-sm"
        >
          🔁 Another round
        </button>
        <Link href="/grammar" className="btn-ghost text-sm">← Grammar topics</Link>
      </div>
    </main>
  );
}
