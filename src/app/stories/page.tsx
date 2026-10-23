"use client";

import BackLink from "@/components/BackLink";
import { useCallback, useEffect, useMemo, useState } from "react";
import { speakSmart, loadVoices } from "@/lib/speech";
import { pushProgressToCloud } from "@/lib/supabase";
import { recordWeekly } from "@/lib/weekly";
import { recordSession } from "@/lib/progress";

/* ───────── types ───────── */
type Story = {
  id: string;
  level: string;
  title: string;
  paragraphs: { de: string; en: string }[];
  vocab: { de: string; en: string }[];
  questions: { q: string; options: string[]; answer: number; why?: string }[];
};

/* ───────── read-progress storage ───────── */
const READ_KEY = "sprachdost_stories_read";
function loadRead(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(READ_KEY) ?? "{}"); } catch { return {}; }
}
function markRead(level: string, id: string) {
  const r = loadRead();
  if (!r[`${level}|${id}`]) {
    r[`${level}|${id}`] = Date.now();
    localStorage.setItem(READ_KEY, JSON.stringify(r));
    recordWeekly({ stories: 1 });
    recordSession({ minutes: 5, words: 0, level });
    pushProgressToCloud();
  }
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

export default function StoriesPage() {
  const [level, setLevel] = useState<string>("A1");
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [read, setRead] = useState<Record<string, number>>({});

  const [view, setView] = useState<"list" | "read" | "quiz" | "done">("list");
  const [story, setStory] = useState<Story | null>(null);
  const [idx, setIdx] = useState(0);        // question index in quiz
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);

  /* load stories for level */
  useEffect(() => {
    let alive = true;
    queueMicrotask(() => { if (alive) setLoading(true); });
    (async () => {
      try {
        const res = await fetch(`/stories/${level}.json`);
        if (res.ok) {
          const arr = (await res.json()) as Story[];
          if (alive) setStories(arr);
        } else if (alive) setStories([]);
      } catch { if (alive) setStories([]); }
      if (alive) { setLoading(false); setRead(loadRead()); }
    })();
    return () => { alive = false; };
  }, [level]);

  const open = useCallback((s: Story) => {
    loadVoices();
    setStory(s);
    setView("read");
  }, []);

  const startQuiz = useCallback(() => {
    if (!story) return;
    setIdx(0); setPicked(null); setCorrect(0);
    setView("quiz");
  }, [story]);

  const pick = useCallback((i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (story && i === story.questions[idx].answer) setCorrect((c) => c + 1);
  }, [picked, story, idx]);

  const next = useCallback(() => {
    if (!story) return;
    if (idx + 1 >= story.questions.length) {
      markRead(story.level, story.id);
      setRead(loadRead());
      setView("done");
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  }, [idx, story]);

  const readCount = useMemo(
    () => stories.filter((s) => read[`${level}|${s.id}`]).length,
    [stories, read, level]
  );

  /* ═══════ DONE ═══════ */
  if (view === "done" && story) {
    const total = story.questions.length;
    const pct = Math.round((correct / total) * 100);
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-2xl mx-auto w-full text-center">
        <div className="text-6xl mb-4">{pct >= 80 ? "🏆" : pct >= 50 ? "💪" : "📖"}</div>
        <h1 className="text-3xl font-extrabold mb-2">Geschafft!</h1>
        <p className="opacity-70 mb-6">{story.title}</p>
        <div className="text-5xl font-extrabold german-gradient bg-clip-text text-transparent mb-8">{correct}/{total} ({pct}%)</div>
        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={() => setView("list")} className="btn-primary !px-6 text-sm">📚 Next story</button>
          <button onClick={() => setView("read")} className="btn-ghost text-sm">📖 Read again</button>
        </div>
      </main>
    );
  }

  /* ═══════ QUIZ ═══════ */
  if (view === "quiz" && story) {
    const q = story.questions[idx];
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="w-full flex items-center justify-between mb-6">
          <button onClick={() => setView("read")} className="text-sm opacity-70 hover:opacity-100">← Story</button>
          <div className="text-sm opacity-70">{idx + 1} / {story.questions.length}</div>
          <div className="text-xs px-2 py-1 rounded-full bg-white/10">🧠 Comprehension</div>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div className="h-full german-gradient rounded-full transition-all" style={{ width: `${(idx / story.questions.length) * 100}%` }} />
        </div>
        <div className="glass rounded-3xl w-full p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-bold leading-snug mb-6">{q.q}</h2>
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
            <button onClick={next} className="btn-primary w-full mt-5 !py-3">
              {idx + 1 >= story.questions.length ? "Finish story ✅" : "Next question →"}
            </button>
          )}
        </div>
      </main>
    );
  }

  /* ═══════ READER ═══════ */
  if (view === "read" && story) {
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="w-full flex items-center justify-between mb-4">
          <button onClick={() => setView("list")} className="text-sm opacity-70 hover:opacity-100">← Stories</button>
          <div className="text-xs px-2 py-1 rounded-full bg-white/10">{story.level}</div>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold mb-6 text-center">{story.title}</h1>

        <div className="glass rounded-3xl w-full p-6 md:p-8 space-y-5">
          {story.paragraphs.map((p, i) => (
            <div key={i} className="group">
              <div className="flex items-start gap-3">
                <p className="flex-1 text-[15px] md:text-base leading-relaxed">{p.de}</p>
                <span
                  onClick={() => speakSmart(p.de, "de-DE", { genderHint: "anna" })}
                  className="glass rounded-full px-2.5 py-1 text-xs hover:bg-white/10 cursor-pointer shrink-0"
                  role="button" aria-label={`Hear paragraph ${i + 1}`}
                >🔊</span>
              </div>
              <p className="text-sm opacity-60 mt-1">{p.en}</p>
              {i + 1 < story.paragraphs.length && <div className="border-b border-white/5 mt-4" />}
            </div>
          ))}
        </div>

        {/* vocab */}
        <div className="glass rounded-3xl w-full p-6 md:p-8 mt-6">
          <div className="text-xs font-bold tracking-widest opacity-60 mb-3">VOCAB FROM THIS STORY</div>
          <div className="flex gap-2 flex-wrap">
            {story.vocab.map((v, i) => (
              <span key={i} className="glass rounded-full px-3 py-1.5 text-xs">
                <span className="text-amber-300 font-semibold">{v.de}</span>
                <span className="opacity-60"> — {v.en}</span>
              </span>
            ))}
          </div>
        </div>

        <button onClick={startQuiz} className="btn-primary w-full mt-6 !py-4">
          ✅ Test yourself: {story.questions.length} questions →
        </button>
      </main>
    );
  }

  /* ═══════ LIST ═══════ */
  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-3xl mx-auto w-full">
      <BackLink fallback="/practice" label="← Practice hub" className="self-start text-sm opacity-70 hover:opacity-100 mb-6" />

      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2">📖 Story Time</h1>
      <p className="opacity-70 text-center text-sm mb-8">
        Short German stories — read with English right under each paragraph, learn the vocab, then prove it with a quiz.
      </p>

      <div className="flex gap-2 mb-6">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => { setLevel(l); setView("list"); }}
            className={`px-5 h-10 rounded-xl font-extrabold transition-all ${
              level === l ? "german-gradient text-black shadow-lg scale-105" : "glass opacity-60 hover:opacity-100"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="text-xs opacity-60 mb-6">{readCount}/{stories.length} stories read • quizzes passed</div>

      {loading ? (
        <div className="opacity-60">Loading stories…</div>
      ) : stories.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <div className="text-4xl mb-3">🚧</div>
          <p className="font-bold mb-2">{level} stories are being prepared</p>
          <p className="text-sm opacity-70">The generator is still running — check back soon.</p>
        </div>
      ) : (
        <div className="w-full grid sm:grid-cols-2 gap-3">
          {stories.map((s) => {
            const done = !!read[`${level}|${s.id}`];
            return (
              <button
                key={s.id}
                onClick={() => open(s)}
                className="glass rounded-2xl p-4 text-left hover:border-amber-400/40 hover:scale-[1.01] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-sm leading-snug">{s.title}</div>
                  <div className="text-xs shrink-0">{done ? "✅" : "📖"}</div>
                </div>
                <div className="text-xs opacity-60 mt-2">
                  {s.paragraphs.length} paragraphs • {s.vocab.length} words • {s.questions.length} questions
                  {done ? " • read" : ""}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
