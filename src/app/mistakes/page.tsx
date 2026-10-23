"use client";

/**
 * Fehlerheft — review every mistake the AI corrected, self-quiz with SRS.
 */

import BackLink from "@/components/BackLink";
import { useCallback, useEffect, useState } from "react";
import { getMistakes, updateMistake, removeMistake, type Mistake } from "@/lib/mistakes";
import { gradeCard, getCardState } from "@/lib/srs";
import { speakSmart, loadVoices } from "@/lib/speech";
import { recordSession } from "@/lib/progress";

type View = "list" | "quiz";

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [dueIds, setDueIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<View>("list");
  const [showOnlyOpen, setShowOnlyOpen] = useState(true);

  /* quiz state */
  const [quizQueue, setQuizQueue] = useState<Mistake[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [again, setAgain] = useState(0);

  const refresh = useCallback(() => {
    const ms = getMistakes();
    setMistakes(ms);
    setDueIds(
      new Set(
        ms.filter((m) => getCardState(`mistake|${m.id}`).due <= Date.now()).map((m) => m.id)
      )
    );
  }, []);

  useEffect(() => {
    queueMicrotask(refresh);
  }, [refresh]);

  const open = mistakes.filter((m) => !m.resolved);
  const list = showOnlyOpen ? open : mistakes;

  const dueFirst = useCallback((ms: Mistake[]) => {
    const due = (m: Mistake) => {
      const st = getCardState(`mistake|${m.id}`);
      return st.due <= Date.now() ? 0 : 1;
    };
    return [...ms].sort((a, b) => due(a) - due(b) || b.date - a.date);
  }, []);

  const startQuiz = () => {
    loadVoices();
    const pool = dueFirst(open).slice(0, 10);
    if (pool.length === 0) return;
    setQuizQueue(pool);
    setQIdx(0);
    setRevealed(false);
    setAgain(0);
    setView("quiz");
  };

  const current = quizQueue[qIdx];

  const grade = (g: number) => {
    if (!current) return;
    gradeCard(`mistake|${current.id}`, g);
    if (g < 3) setAgain((n) => n + 1);
    if (qIdx + 1 >= quizQueue.length) {
      recordSession({ minutes: Math.max(2, quizQueue.length), words: 0, level: "Fehlerheft" });
      refresh();
      setView("list");
    } else {
      setQIdx((i) => i + 1);
      setRevealed(false);
    }
  };

  /* ─── quiz ─── */
  if (view === "quiz" && current) {
    const againCount = quizQueue.filter((_, i) => i < qIdx).length + again;
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="w-full flex items-center justify-between mb-6">
          <button onClick={() => setView("list")} className="text-sm opacity-70 hover:opacity-100">← Quit</button>
          <div className="text-sm opacity-70">{qIdx + 1} / {quizQueue.length}</div>
          <div className="text-xs px-2 py-1 rounded-full bg-white/10">Fehlerheft</div>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div className="h-full german-gradient rounded-full transition-all" style={{ width: `${(qIdx / quizQueue.length) * 100}%` }} />
        </div>

        <div className="glass rounded-3xl w-full p-6 md:p-8">
          <div className="text-xs font-bold tracking-widest opacity-60 mb-2">YOUR SENTENCE (from {current.context})</div>
          <p className="text-lg leading-relaxed mb-4">{current.wrong}</p>
          {!revealed ? (
            <button onClick={() => setRevealed(true)} className="btn-primary w-full !py-4">
              👀 Show the correction
            </button>
          ) : (
            <>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/40 px-4 py-3 mb-4">
                <div className="text-[10px] font-bold tracking-widest text-emerald-300 mb-1">CORRECTION</div>
                <p className="text-sm leading-relaxed whitespace-pre-line">{current.note}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => grade(1)} className="flex-1 rounded-full border border-red-400/50 py-3 text-sm font-bold hover:bg-red-500/10">
                  🔁 Again
                </button>
                <button onClick={() => grade(3)} className="flex-1 rounded-full border border-amber-400/50 py-3 text-sm font-bold hover:bg-amber-500/10">
                  🙂 Hard
                </button>
                <button onClick={() => grade(5)} className="flex-1 rounded-full border border-emerald-400/50 py-3 text-sm font-bold hover:bg-emerald-500/10">
                  😎 Got it
                </button>
              </div>
            </>
          )}
        </div>
        <p className="text-xs opacity-50 mt-4">reviewed {againCount} so far</p>
      </main>
    );
  }

  /* ─── list ─── */
  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-3xl mx-auto w-full">
      <BackLink fallback="/practice" label="← Practice hub" className="self-start text-sm opacity-70 hover:opacity-100 mb-6" />

      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2">📕 Fehlerheft</h1>
      <p className="opacity-70 text-center text-sm mb-6">
        Every correction from Anna, Lehrer and the exam grader lands here. Review, self-quiz, and make it stick.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        <button onClick={startQuiz} disabled={open.length === 0} className="btn-primary text-sm !py-3 !px-6 disabled:opacity-40">
          ⚡ Quick quiz ({Math.min(10, open.length)})
        </button>
        <button
          onClick={() => setShowOnlyOpen((v) => !v)}
          className="btn-ghost text-sm !py-3 !px-6"
        >
          {showOnlyOpen ? "Show learned too" : "Show only open"}
        </button>
      </div>

      {list.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <div className="text-4xl mb-3">🎉</div>
          <p className="font-bold mb-2">{mistakes.length === 0 ? "No mistakes collected yet!" : "All mistakes resolved — stark!"}</p>
          <p className="text-sm opacity-70">
            {mistakes.length === 0
              ? "Practise with Anna, Lehrer or the exam simulator — every correction is saved here automatically."
              : "Keep practising; new corrections will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 w-full">
          {list.map((m) => {
            const due = dueIds.has(m.id);
            return (
              <div key={m.id} className={`glass rounded-2xl p-4 ${m.resolved ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="text-xs opacity-60">{m.context} • {new Date(m.date).toLocaleDateString("en-IN")}</div>
                  <div className="flex gap-2 shrink-0">
                    {due && !m.resolved && (
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-full px-2 py-0.5">
                        due
                      </span>
                    )}
                    <button
                      onClick={() => speakSmart(m.wrong, "de-DE", { rate: 0.9 })}
                      className="text-xs glass rounded-full px-2.5 py-1 hover:bg-white/10"
                      aria-label="Hear the sentence"
                    >🔊</button>
                  </div>
                </div>
                <p className="text-sm font-semibold leading-relaxed">{m.wrong}</p>
                <p className="text-sm text-emerald-300/90 leading-relaxed mt-2 whitespace-pre-line">→ {m.note}</p>
                <div className="flex gap-2 mt-3">
                  {!m.resolved ? (
                    <button
                      onClick={() => { updateMistake(m.id, { resolved: true }); refresh(); }}
                      className="text-xs glass rounded-full px-3 py-1.5 hover:bg-white/10"
                    >
                      ✅ Learned
                    </button>
                  ) : (
                    <button
                      onClick={() => { updateMistake(m.id, { resolved: false }); refresh(); }}
                      className="text-xs glass rounded-full px-3 py-1.5 hover:bg-white/10"
                    >
                      ↩ Re-open
                    </button>
                  )}
                  <button
                    onClick={() => { removeMistake(m.id); refresh(); }}
                    className="text-xs opacity-50 hover:opacity-90 px-2 py-1.5"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
