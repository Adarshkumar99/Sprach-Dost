"use client";

/**
 * Schreibtrainer — Goethe-style writing tasks with AI grading.
 * Uses the same prompts + examiner as the exam simulator, but as open practice.
 */

import BackLink from "@/components/BackLink";
import { useEffect, useMemo, useState } from "react";
import { EXAMS, type ExamLevel, type SchreibenPart } from "@/lib/exams";
import { speakSmart, norm } from "@/lib/speech";
import {
  parseExamWriting,
  parseScoreOutOf15,
  type ExamWritingReport,
} from "@/lib/parse";
import { recordSession } from "@/lib/progress";
import { loadAttempts, saveAttempt } from "@/lib/writingStore";

const LEVELS: ExamLevel[] = ["A1", "A2", "B1"];

function allSchreiben(): { level: ExamLevel; part: SchreibenPart }[] {
  const out: { level: ExamLevel; part: SchreibenPart }[] = [];
  for (const fmt of EXAMS) {
    for (const lvl of LEVELS) {
      for (const p of fmt.parts[lvl]) {
        if (p.kind === "schreiben") out.push({ level: lvl, part: p });
      }
    }
  }
  return out;
}

export default function WritingPage() {
  const tasks = useMemo(() => allSchreiben(), []);
  const [level, setLevel] = useState<ExamLevel>("A1");
  const [sel, setSel] = useState(0); // index into tasks
  const [text, setText] = useState("");
  const [report, setReport] = useState<ExamWritingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<ReturnType<typeof loadAttempts>>([]);

  useEffect(() => {
    queueMicrotask(() => setAttempts(loadAttempts()));
  }, []);

  const pool = tasks.filter((t) => t.level === level);
  const task = pool[Math.min(sel, pool.length - 1)] ?? tasks[0];

  const words = text.trim() ? norm(text).split(" ").filter(Boolean).length : 0;

  const grade = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `TASK (in German): ${task.part.promptDe}
Required points: ${task.part.bullets.join(" | ")}
Target length: ~${task.part.wordTarget} words.

STUDENT'S TEXT:
${text.trim()}`,
            },
          ],
          mode: "exam-writing",
          level,
        }),
      });
      const data = await res.json();
      if (data.offline) {
        setError("AI grader is offline (no GROQ_API_KEY configured).");
        return;
      }
      if (!data.reply) {
        setError(`Grading failed${data.error ? `: ${data.error}` : ""}. Try again.`);
        return;
      }
      const rep = parseExamWriting(data.reply);
      setReport(rep);
      const score = parseScoreOutOf15(rep.score);
      saveAttempt({
        prompt: task.part.promptDe.slice(0, 120),
        level,
        score,
        text: text.trim().slice(0, 500),
      });
      setAttempts(loadAttempts());
      recordSession({ minutes: 4, words: 0, level });
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-2xl mx-auto w-full">
      <BackLink fallback="/practice" label="← Practice hub" className="self-start text-sm opacity-70 hover:opacity-100 mb-6" />

      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2">✍️ Schreibtrainer</h1>
      <p className="opacity-70 text-center text-sm mb-6">
        Goethe-style writing tasks — typed, graded by the AI examiner (/15, corrected version).
      </p>

      <div className="flex gap-2 mb-4">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => { setLevel(l); setSel(0); setReport(null); setText(""); }}
            className={`px-5 h-10 rounded-xl font-extrabold transition-all ${
              level === l ? "german-gradient text-black shadow-lg scale-105" : "glass opacity-60 hover:opacity-100"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* prompt picker */}
      <div className="grid gap-2 w-full mb-6">
        {pool.map((t, i) => (
          <button
            key={`${t.level}-${t.part.title}-${i}`}
            onClick={() => { setSel(i); setReport(null); setText(""); }}
            className={`glass rounded-xl p-3 text-left text-sm border transition-all ${
              task?.part.title === t.part.title ? "border-yellow-400/60 shadow-lg" : "border-white/10 opacity-75 hover:opacity-100"
            }`}
          >
            <b>{t.part.title}</b>
            <span className="opacity-60"> — {t.part.promptEn.slice(0, 70)}…</span>
          </button>
        ))}
      </div>

      {task && (
        <>
          <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
            <div className="text-xs font-bold tracking-widest opacity-60 mb-2">{task.part.title}</div>
            <p className="text-sm leading-relaxed">{task.part.promptDe}</p>
            <p className="text-xs opacity-60 mt-2 italic">{task.part.promptEn}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {task.part.bullets.map((b) => (
                <span key={b} className="text-xs glass rounded-full px-3 py-1 opacity-80">✓ {b}</span>
              ))}
            </div>
            <button
              onClick={() => speakSmart(task.part.promptDe, "de-DE", { genderHint: "lehrer", rate: 0.9 })}
              className="text-xs glass rounded-full px-3 py-1.5 mt-4"
            >
              🔊 Hear the task
            </button>
          </div>

          <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold tracking-widest opacity-60">YOUR TEXT</div>
              <div className="text-xs opacity-50">{words} / ~{task.part.wordTarget} words</div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Sehr geehrte Damen und Herren, …"
              rows={9}
              className="w-full rounded-xl bg-white/5 border border-white/10 p-4 text-[15px] leading-relaxed outline-none focus:border-yellow-400/50"
            />
            {!report && (
              <button onClick={grade} disabled={!text.trim() || loading} className="btn-primary w-full !py-4 mt-4 disabled:opacity-40">
                {loading ? "✨ AI examiner is grading…" : "✨ Submit for AI grading"}
              </button>
            )}
            {error && <p className="text-xs text-yellow-400/90 mt-3">{error}</p>}
            {report && (
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-extrabold german-gradient-text">{report.score || "—"}</span>
                  <span className="text-xs opacity-60">/ 15 points</span>
                </div>
                {report.task && <p className="opacity-80">📋 {report.task}</p>}
                {report.grammar && <p className="opacity-80 whitespace-pre-line">✏️ {report.grammar}</p>}
                {report.vocab && <p className="opacity-80">📚 {report.vocab}</p>}
                {report.fixes && (
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-xs font-bold opacity-60 mb-1">CORRECTED VERSION</div>
                    <p className="whitespace-pre-line">{report.fixes}</p>
                  </div>
                )}
                <button
                  onClick={() => { setReport(null); setText(""); }}
                  className="btn-ghost w-full !py-3 text-sm"
                >
                  ✍️ Write another
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {attempts.length > 0 && (
        <div className="glass rounded-2xl w-full p-5">
          <div className="text-xs font-bold tracking-widest opacity-60 mb-3">RECENT ATTEMPTS</div>
          <div className="space-y-2">
            {attempts.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="opacity-70 truncate mr-3">
                  {new Date(a.date).toLocaleDateString("en-IN")} • {a.prompt}…
                </span>
                <span className="font-extrabold text-amber-300 shrink-0">{a.score ?? "–"}/15</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
