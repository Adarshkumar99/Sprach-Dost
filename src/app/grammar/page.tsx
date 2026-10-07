"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { speakSmart, loadVoices } from "@/lib/speech";
import { pushProgressToCloud } from "@/lib/supabase";

/* ───────── types ───────── */
type GrammarQuestion = { q: string; options: string[]; answer: number; why?: string };
type GrammarTopic = { id: string; title: string; lesson: string; questions: GrammarQuestion[] };

type View =
  | { name: "levels" }
  | { name: "lesson"; topic: GrammarTopic }
  | { name: "quiz"; topic: GrammarTopic }
  | { name: "done"; topic: GrammarTopic; correct: number };

const LEVELS = ["A1", "A2", "B1"] as const;

/* ───────── score storage (cloud sync comes with auth) ───────── */
const SCORE_KEY = "sprachdost_grammar_scores";
type ScoreStore = Record<string, { correct: number; total: number; when: number }>;

function loadScores(): ScoreStore {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(SCORE_KEY) ?? "{}"); } catch { return {}; }
}
function saveScore(level: string, topicId: string, correct: number, total: number) {
  const s = loadScores();
  const key = `${level}|${topicId}`;
  const prev = s[key];
  if (!prev || correct > prev.correct || (correct === prev.correct && total > prev.total)) {
    s[key] = { correct, total, when: Date.now() };
    localStorage.setItem(SCORE_KEY, JSON.stringify(s));
    pushProgressToCloud();
  }
}

const scoreKey = (level: string, id: string) => `${level}|${id}`;

export default function GrammarPage() {
  const [level, setLevel] = useState<string>("A1");
  const [topics, setTopics] = useState<GrammarTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ name: "levels" });
  const [scores, setScores] = useState<ScoreStore>({});

  /* quiz state */
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  /* load pack for level */
  useEffect(() => {
    let alive = true;
    queueMicrotask(() => { if (alive) setLoading(true); });
    (async () => {
      try {
        const res = await fetch(`/grammar/${level}.json`);
        if (res.ok) {
          const arr = (await res.json()) as GrammarTopic[];
          if (alive) setTopics(arr);
        } else if (alive) setTopics([]);
      } catch {
        if (alive) setTopics([]);
      }
      if (alive) { setLoading(false); setScores(loadScores()); }
    })();
    return () => { alive = false; };
  }, [level]);

  const startQuiz = useCallback((topic: GrammarTopic) => {
    loadVoices();
    setView({ name: "quiz", topic });
    setQIdx(0);
    setPicked(null);
    setCorrectCount(0);
  }, []);

  const pick = useCallback((i: number, topic: GrammarTopic) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === topic.questions[qIdx].answer) setCorrectCount((c) => c + 1);
  }, [picked, qIdx]);

  const next = useCallback((topic: GrammarTopic, correct: number) => {
    if (qIdx + 1 >= topic.questions.length) {
      saveScore(level, topic.id, correct, topic.questions.length);
      setScores(loadScores());
      setView({ name: "done", topic, correct });
    } else {
      setQIdx((i) => i + 1);
      setPicked(null);
    }
  }, [qIdx, level]);

  const doneCount = useMemo(
    () => topics.filter((t) => scores[scoreKey(level, t.id)]).length,
    [topics, scores, level]
  );

  /* ═══════════ VIEWS ═══════════ */

  if (view.name === "done") {
    const { topic, correct } = view;
    const total = topic.questions.length;
    const pct = Math.round((correct / total) * 100);
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-2xl mx-auto w-full text-center">
        <div className="text-6xl mb-4">{pct >= 80 ? "🏆" : pct >= 50 ? "💪" : "📖"}</div>
        <h1 className="text-3xl font-extrabold mb-2">
          {pct >= 80 ? "Stark!" : pct >= 50 ? "Good effort!" : "Keep practicing!"}
        </h1>
        <p className="opacity-70 mb-6">{topic.title}</p>
        <div className="text-5xl font-extrabold german-gradient bg-clip-text text-transparent mb-8">
          {correct}/{total} ({pct}%)
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={() => startQuiz(topic)} className="btn-primary !px-6 text-sm">🔁 Retry quiz</button>
          <button onClick={() => setView({ name: "lesson", topic })} className="btn-ghost text-sm">📖 Lesson again</button>
          <button onClick={() => setView({ name: "levels" })} className="btn-ghost text-sm">← All topics</button>
        </div>
      </main>
    );
  }

  if (view.name === "quiz") {
    const { topic } = view;
    const q = topic.questions[qIdx];
    const isRight = picked === q.answer;
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="w-full flex items-center justify-between mb-6">
          <button onClick={() => setView({ name: "lesson", topic })} className="text-sm opacity-70 hover:opacity-100">← Quit</button>
          <div className="text-sm opacity-70">{qIdx + 1} / {topic.questions.length}</div>
          <div className="text-xs px-2 py-1 rounded-full bg-white/10">{level} • {topic.title.split("(")[0].trim()}</div>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div className="h-full german-gradient rounded-full transition-all" style={{ width: `${(qIdx / topic.questions.length) * 100}%` }} />
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
                  onClick={() => pick(i, topic)}
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

          {picked !== null && (
            <div className="mt-5 bubble-in">
              <div className={`rounded-xl px-4 py-3 text-sm ${isRight ? "bg-emerald-500/10 border border-emerald-400/40" : "bg-red-500/10 border border-red-400/40"}`}>
                <b>{isRight ? "Richtig! 🎉 " : "Not quite. "}</b>{q.why}
              </div>
              <button onClick={() => next(topic, correctCount)} className="btn-primary w-full mt-4 !py-3">
                {qIdx + 1 >= topic.questions.length ? "See result →" : "Next question →"}
              </button>
            </div>
          )}
        </div>
        {picked === null && (
          <p className="text-xs opacity-50 mt-6">Pick an answer — you&apos;ll get a short explanation either way.</p>
        )}
      </main>
    );
  }

  if (view.name === "lesson") {
    const { topic } = view;
    const best = scores[scoreKey(level, topic.id)];
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="w-full flex items-center justify-between mb-6">
          <button onClick={() => setView({ name: "levels" })} className="text-sm opacity-70 hover:opacity-100">← Topics</button>
          <div className="text-xs px-2 py-1 rounded-full bg-white/10">{level}</div>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2 text-center">{topic.title}</h1>
        {best && (
          <p className="text-sm opacity-60 mb-4">Best quiz score: {best.correct}/{best.total}</p>
        )}
        <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
          <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{topic.lesson}</p>
        </div>
        <button onClick={() => startQuiz(topic)} className="btn-primary !py-4 !px-8 w-full md:w-auto">
          📝 Practice: {topic.questions.length} questions →
        </button>
      </main>
    );
  }

  /* ── topic list ── */
  const totalQ = topics.reduce((n, t) => n + t.questions.length, 0);
  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-3xl mx-auto w-full">
      <Link href="/practice" className="self-start text-sm opacity-70 hover:opacity-100 mb-6">← Practice hub</Link>

      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2">📐 Grammar Lessons</h1>
      <p className="opacity-70 text-center text-sm mb-8">
        Goethe syllabus {level}: read the lesson, then prove it with a quiz. {totalQ > 0 && <>({totalQ} questions in {level})</>}
      </p>

      <div className="flex gap-2 mb-6">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => { setLevel(l); setView({ name: "levels" }); }}
            className={`px-5 h-10 rounded-xl font-extrabold transition-all ${
              level === l ? "german-gradient text-black shadow-lg scale-105" : "glass opacity-60 hover:opacity-100"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="text-xs opacity-60 mb-6">{doneCount}/{topics.length} topics attempted</div>

      {loading ? (
        <div className="opacity-60">Loading lessons…</div>
      ) : topics.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <div className="text-4xl mb-3">🚧</div>
          <p className="font-bold mb-2">{level} lessons are being prepared</p>
          <p className="text-sm opacity-70">The content generator is still running — check back in a little while.</p>
        </div>
      ) : (
        <div className="w-full grid sm:grid-cols-2 gap-3">
          {topics.map((t) => {
            const best = scores[scoreKey(level, t.id)];
            return (
              <button
                key={t.id}
                onClick={() => setView({ name: "lesson", topic: t })}
                className="glass rounded-2xl p-4 text-left hover:border-amber-400/40 hover:scale-[1.01] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-sm leading-snug">{t.title}</div>
                  <div className="text-xs shrink-0">
                    {best ? "✅" : "▫️"}
                  </div>
                </div>
                <div className="text-xs opacity-60 mt-2">
                  {t.questions.length} questions
                  {best ? ` • best ${best.correct}/${t.questions.length}` : ""}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
