"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EXAMS,
  EXAM_FORMAT_META,
  getExam,
  type ExamFormatId,
  type ExamLevel,
  type ExamPart,
  type Mcq,
} from "@/lib/exams";
import { speakSmart, listen, keywordScore, norm } from "@/lib/speech";
import {
  parseExamWriting,
  parseExamSpeaking,
  parseScoreOutOf15,
  parseRatingOutOf5,
  type ExamWritingReport,
  type ExamSpeakingReport,
} from "@/lib/parse";
import { saveExamAttempt, getExamAttempts, type ExamAttempt } from "@/lib/examStore";
import { addMistake } from "@/lib/mistakes";
import { recordSession } from "@/lib/progress";
import { recordWeekly } from "@/lib/weekly";
import { loadSeries, FREE_COUNT, SERIES_LEVELS, type SeriesLevel, type SeriesTest } from "@/lib/testSeries";
import { usePro } from "@/lib/usePro";

type Phase = "setup" | "exam" | "done";
type PartResult = { title: string; pct: number };

/** convert a generated series test into the runner's part format */
function seriesToParts(t: SeriesTest): ExamPart[] {
  return [
    { kind: "lesen", title: t.lesen.title, instructionsEn: "Read the text and tap the right answer.", text: t.lesen.text, questions: t.lesen.questions },
    { kind: "horen", title: t.horen.title, instructionsEn: "Listen carefully — you can replay it up to 3 times.", scriptDe: t.horen.scriptDe, questions: t.horen.questions },
    { kind: "schreiben", title: t.schreiben.title, instructionsEn: "Type a German text. The AI examiner grades it.", promptDe: t.schreiben.promptDe, promptEn: t.schreiben.promptEn, wordTarget: Number(t.schreiben.wordTarget), bullets: t.schreiben.bullets },
    { kind: "sprechen", title: "Sprechen — 3 Teile", instructionsEn: "Hear the examiner, speak your answer in German.", tasks: t.sprechen.tasks },
  ];
}

async function callAI(
  mode: string,
  prompt: string,
  level: string
): Promise<{ reply: string | null; offline: boolean; error?: string }> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }], mode, level }),
    });
    const data = await res.json();
    if (data.offline) return { reply: null, offline: true };
    return { reply: data.reply ?? null, offline: false, error: data.error };
  } catch {
    return { reply: null, offline: false, error: "network" };
  }
}

function McqBlock({
  questions,
  answers,
  onPick,
}: {
  questions: Mcq[];
  answers: Record<number, number>;
  onPick: (qi: number, oi: number) => void;
}) {
  return (
    <div className="space-y-5">
      {questions.map((q, qi) => (
        <div key={qi}>
          <div className="text-sm font-bold mb-2">
            {qi + 1}. {q.q}
          </div>
          <div className="grid gap-2">
            {q.options.map((opt, oi) => {
              const picked = answers[qi] === oi;
              return (
                <button
                  key={oi}
                  onClick={() => onPick(qi, oi)}
                  className={`text-left text-sm rounded-xl px-4 py-2.5 border transition-all ${
                    picked
                      ? "german-gradient text-black font-bold border-transparent shadow-lg"
                      : "glass border-white/10 opacity-80 hover:opacity-100"
                  }`}
                >
                  {String.fromCharCode(65 + oi)}. {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ExamPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [formatId, setFormatId] = useState<ExamFormatId>("goethe");
  const [level, setLevel] = useState<ExamLevel>("A1");
  const [mode, setMode] = useState<"fixed" | "series">("fixed");
  const [seriesLevel, setSeriesLevel] = useState<SeriesLevel>("A1");
  const [seriesTests, setSeriesTests] = useState<SeriesTest[]>([]);
  const [series, setSeries] = useState<SeriesTest | null>(null);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [proNudge, setProNudge] = useState(false);
  const { isPro } = usePro();

  const [partIdx, setPartIdx] = useState(0);
  const [mcq, setMcq] = useState<Record<string, number>>({});
  const [horenPlays, setHorenPlays] = useState(0);
  const [horenPlaying, setHorenPlaying] = useState(false);

  const [written, setWritten] = useState("");
  const [writing, setWriting] = useState<{ report: ExamWritingReport | null; loading: boolean; error: string | null }>({
    report: null,
    loading: false,
    error: null,
  });

  const [taskIdx, setTaskIdx] = useState(0);
  const [spoken, setSpoken] = useState("");
  const [spokenAll, setSpokenAll] = useState<Record<number, string>>({});
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState<{ rubric: ExamSpeakingReport | null; loading: boolean; error: string | null }>({
    rubric: null,
    loading: false,
    error: null,
  });

  const [partPct, setPartPct] = useState<Record<number, number>>({});
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number>(0);
  const savedRef = useRef(false);

  const exam = useMemo(() => getExam(formatId, level), [formatId, level]);
  const parts: ExamPart[] | undefined = useMemo(
    () => (series ? seriesToParts(series) : exam?.parts),
    [series, exam]
  );
  const part: ExamPart | undefined = parts?.[partIdx];
  const activeLevel = series ? seriesLevel : level;
  const examLabel = series
    ? `Goethe Test-Serie ${seriesLevel} • ${series.title}`
    : `${exam?.format.label ?? "Goethe"} ${level}`;
  const examFormatId = series ? "goethe-series" : (exam?.format.id ?? "goethe");

  /* load series bank + attempt history for the picker */
  useEffect(() => {
    let alive = true;
    if (mode !== "series") return;
    loadSeries(seriesLevel).then((t) => {
      if (alive) setSeriesTests(t);
    });
    return () => {
      alive = false;
    };
  }, [mode, seriesLevel]);

  useEffect(() => {
    queueMicrotask(() => setAttempts(getExamAttempts()));
  }, []);

  /* elapsed timer */
  useEffect(() => {
    if (phase !== "exam") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  /* auto-read examiner prompt for sprechen tasks */
  useEffect(() => {
    if (phase !== "exam" || part?.kind !== "sprechen") return;
    const task = part.tasks[taskIdx];
    if (task) speakSmart(task.promptDe, "de-DE", { genderHint: "lehrer", rate: 0.9 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, partIdx, taskIdx]);

  const partPctFor = useCallback(
    (p: ExamPart, idx: number): number | null => {
      if (p.kind === "lesen" || p.kind === "horen") {
        const total = p.questions.length;
        const answered = p.questions.filter((q, qi) => mcq[`${idx}:${qi}`] === q.answer).length;
        return Math.round((answered / total) * 100);
      }
      return partPct[idx] ?? null;
    },
    [mcq, partPct]
  );

  const startExam = useCallback(() => {
    startedAt.current = Date.now();
    savedRef.current = false;
    setPartIdx(0);
    setMcq({});
    setHorenPlays(0);
    setWritten("");
    setWriting({ report: null, loading: false, error: null });
    setTaskIdx(0);
    setSpoken("");
    setSpokenAll({});
    setSpeaking({ rubric: null, loading: false, error: null });
    setPartPct({});
    setElapsed(0);
    setPhase("exam");
  }, []);

  const startSeries = useCallback(
    (t: SeriesTest) => {
      setSeries(t);
      startExam();
    },
    [startExam]
  );

  const pickSeries = useCallback(
    (t: SeriesTest, index: number) => {
      if (index + 1 > FREE_COUNT && !isPro) {
        setProNudge(true);
        return;
      }
      setProNudge(false);
      startSeries(t);
    },
    [isPro, startSeries]
  );

  const playHoren = () => {
    if (part?.kind !== "horen" || horenPlaying) return;
    if (horenPlays >= 3) return;
    setHorenPlays((n) => n + 1);
    setHorenPlaying(true);
    speakSmart(part.scriptDe, "de-DE", { genderHint: "lehrer", rate: 0.85, onEnd: () => setHorenPlaying(false) });
  };

  const doListen = useCallback(async () => {
    if (part?.kind !== "sprechen") return;
    setListening(true);
    setSpoken("");
    try {
      const r = await listen("de-DE", { maxMs: 30000, onInterim: (t) => setSpoken(t) });
      setSpoken(r.text);
      setSpokenAll((p) => ({ ...p, [taskIdx]: r.text }));
    } catch {
      /* mic cancelled / no speech */
    }
    setListening(false);
  }, [part, taskIdx]);

  const nextTask = () => {
    if (!part || part.kind !== "sprechen") return;
    if (taskIdx + 1 < part.tasks.length) {
      setTaskIdx((i) => i + 1);
      setSpoken("");
    }
  };

  const gradeWriting = async () => {
    if (part?.kind !== "schreiben" || !written.trim() || writing.loading) return;
    setWriting({ report: null, loading: true, error: null });
    const prompt = `TASK (in German): ${part.promptDe}
Required points: ${part.bullets.join(" | ")}
Target length: ~${part.wordTarget} words.

STUDENT'S TEXT:
${written.trim()}`;
    const { reply, offline, error } = await callAI("exam-writing", prompt, activeLevel);
    if (!reply) {
      setWriting({
        report: null,
        loading: false,
        error: offline
          ? "AI grader is offline (no GROQ_API_KEY). Your text is saved — keyword check only."
          : `AI grader failed${error ? `: ${error}` : ""}. Try again.`,
      });
      // fallback: rough length-based pct
      const words = norm(written).split(" ").filter(Boolean).length;
      setPartPct((p) => ({ ...p, [partIdx]: Math.min(100, Math.round((words / part.wordTarget) * 60)) }));
      return;
    }
    const report = parseExamWriting(reply);
    const score = parseScoreOutOf15(report.score);
    if (score !== null) setPartPct((p) => ({ ...p, [partIdx]: Math.round((score / 15) * 100) }));
    if (report.grammar) {
      addMistake({
        wrong: written.trim().slice(0, 240),
        note: report.grammar.slice(0, 400),
        context: `Exam Schreiben — ${part.title}`,
      });
    }
    setWriting({ report, loading: false, error: null });
  };

  const gradeSpeaking = async () => {
    if (part?.kind !== "sprechen" || speaking.loading) return;
    setSpeaking({ rubric: null, loading: true, error: null });
    const transcript = part.tasks
      .map((t, i) => `TASK: ${t.title}\nEXAMINER: ${t.promptDe}\nSTUDENT: ${spokenAll[i] ?? "(no answer)"}`)
      .join("\n\n");
    const words = norm(Object.values(spokenAll).join(" ")).split(" ").filter(Boolean).length;
    const kwTotal = part.tasks.reduce((acc, t, i) => {
      const hits = keywordScore(spokenAll[i] ?? "", t.keywords);
      return acc + (t.keywords.length ? hits / t.keywords.length : 0);
    }, 0);
    const kwPct = Math.round((kwTotal / part.tasks.length) * 100);

    const { reply, offline, error } = await callAI("exam-speaking", transcript, activeLevel);
    if (!reply) {
      setSpeaking({ rubric: null, loading: false, error: offline ? "AI offline — keyword score used." : `AI failed${error ? `: ${error}` : ""}.` });
      setPartPct((p) => ({ ...p, [partIdx]: kwPct }));
      return;
    }
    const rubric = parseExamSpeaking(reply);
    const dims = [rubric.fluency, rubric.vocab, rubric.accuracy, rubric.pronunciation]
      .map(parseRatingOutOf5)
      .filter((n): n is number => n !== null);
    const aiPct = dims.length ? Math.round((dims.reduce((a, b) => a + b, 0) / dims.length) * 20) : kwPct;
    setPartPct((p) => ({ ...p, [partIdx]: Math.round(aiPct * 0.6 + kwPct * 0.4 + (words ? 0 : -100)) }));
    if (rubric.mistakes) {
      addMistake({
        wrong: Object.values(spokenAll).join(" ").slice(0, 240),
        note: rubric.mistakes.slice(0, 400),
        context: `Exam Sprechen — ${examLabel}`,
      });
    }
    setSpeaking({ rubric, loading: false, error: null });
  };

  const finishExam = () => {
    if (!parts) return;
    recordWeekly({ examMinutes: Math.max(1, Math.round(elapsed / 60)) });
    recordSession({ minutes: Math.max(1, Math.round(elapsed / 60)), words: 0, level: activeLevel });
    setPhase("done");
  };

  /** advance to next part, or finish the exam when past the last one */
  const nextPart = () => {
    if (!parts) return;
    if (partIdx + 1 >= parts.length) {
      finishExam();
      return;
    }
    setPartIdx((i) => i + 1);
    setHorenPlays(0);
    setWritten("");
    setWriting({ report: null, loading: false, error: null });
    setTaskIdx(0);
    setSpoken("");
    setSpokenAll({});
    setSpeaking({ rubric: null, loading: false, error: null });
  };

  /* overall + save on done */
  const results: PartResult[] = useMemo(() => {
    if (!parts) return [];
    return parts
      .map((p, i) => ({ title: p.title, pct: partPctFor(p, i) ?? 0 }))
      .map((r) => ({ ...r, pct: Math.max(0, r.pct) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, parts, partPct, mcq]);

  const overall = results.length ? Math.round(results.reduce((a, b) => a + b.pct, 0) / results.length) : 0;

  useEffect(() => {
    if (phase !== "done" || savedRef.current || !parts) return;
    savedRef.current = true;
    const dims = speaking.rubric
      ? {
          fluency: parseRatingOutOf5(speaking.rubric.fluency) ?? 0,
          vocab: parseRatingOutOf5(speaking.rubric.vocab) ?? 0,
          accuracy: parseRatingOutOf5(speaking.rubric.accuracy) ?? 0,
          pronunciation: parseRatingOutOf5(speaking.rubric.pronunciation) ?? 0,
          cefr: speaking.rubric.cefr,
        }
      : undefined;
    saveExamAttempt({
      id: `exam-${startedAt.current}`,
      format: examFormatId,
      level: activeLevel,
      testId: series?.id,
      date: startedAt.current,
      overall,
      perPart: results,
      rubric: dims && dims.fluency + dims.vocab + dims.accuracy + dims.pronunciation > 0 ? dims : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ─── setup ─── */
  if (phase === "setup" || !parts || !part) {
    const format = exam?.format ?? EXAMS[0];
    const bestFor = (testId: string): number | null => {
      const rel = attempts.filter((a) => a.testId === testId);
      return rel.length ? Math.max(...rel.map((a) => a.overall)) : null;
    };
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-xl mx-auto w-full text-center">
        <Link href="/practice" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100">
          ← Back
        </Link>
        <div className="text-6xl mb-3">🎓</div>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Full Exam Simulator</h1>
        <p className="opacity-70 text-sm mb-6">
          Lesen • Hören • Schreiben • Sprechen — complete mocks with AI grading.
        </p>

        {/* mode tabs */}
        <div className="flex gap-2 mb-8 w-full">
          <button
            onClick={() => { setMode("fixed"); setProNudge(false); }}
            className={`flex-1 rounded-2xl py-3 text-sm font-extrabold transition-all ${
              mode === "fixed" ? "german-gradient text-black shadow-lg" : "glass opacity-70 hover:opacity-100"
            }`}
          >
            📋 Modelltests
          </button>
          <button
            onClick={() => { setMode("series"); setProNudge(false); }}
            className={`flex-1 rounded-2xl py-3 text-sm font-extrabold transition-all ${
              mode === "series" ? "german-gradient text-black shadow-lg" : "glass opacity-70 hover:opacity-100"
            }`}
          >
            📚 Test-Serie 50×
          </button>
        </div>

        {mode === "fixed" ? (
          <>
            <div className="grid gap-2 w-full mb-6">
              {EXAM_FORMAT_META.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormatId(f.id)}
                  className={`glass rounded-2xl p-4 text-left border transition-all ${
                    formatId === f.id ? "border-yellow-400/70 shadow-lg scale-[1.02]" : "border-white/10 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="font-extrabold">{f.label}</div>
                  <div className="text-xs opacity-60">{f.tagline}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-6">
              {(["A1", "A2", "B1"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`px-5 h-10 rounded-xl font-extrabold transition-all ${
                    level === l ? "german-gradient text-black shadow-lg scale-105" : "glass opacity-60 hover:opacity-100"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="glass rounded-2xl p-4 w-full mb-6 text-left">
              {format.parts[level].map((p, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <div className="text-sm font-semibold">{p.title}</div>
                  <div className="text-xs opacity-60">
                    {p.kind === "sprechen" ? `${p.tasks.length} tasks` : p.kind === "schreiben" ? "AI graded" : `${p.questions.length} Qs`}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={startExam} className="btn-primary !py-4 !px-10 w-full">
              🎓 Start full mock exam →
            </button>
          </>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              {SERIES_LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => { setSeriesLevel(l); setProNudge(false); }}
                  className={`px-5 h-10 rounded-xl font-extrabold transition-all ${
                    seriesLevel === l ? "german-gradient text-black shadow-lg scale-105" : "glass opacity-60 hover:opacity-100"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <p className="text-xs opacity-60 mb-4">
              Goethe-style full mocks • Tests 1–{FREE_COUNT} free, 11–50 Pro ✨
              {seriesTests.length < 50 && <> • {seriesTests.length}/50 generated (more coming daily)</>}
            </p>

            {seriesTests.length === 0 ? (
              <div className="glass rounded-2xl p-8 w-full mb-6">
                <div className="text-4xl mb-2">🚧</div>
                <p className="text-sm opacity-70">Tests for {seriesLevel} are being generated — check back tomorrow!</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 w-full mb-4">
                {seriesTests.map((t, i) => {
                  const best = bestFor(t.id);
                  const locked = i + 1 > FREE_COUNT && !isPro;
                  return (
                    <button
                      key={t.id}
                      onClick={() => pickSeries(t, i)}
                      className={`relative rounded-xl py-2.5 text-sm font-extrabold transition-all ${
                        locked
                          ? "glass opacity-40 cursor-pointer hover:opacity-70"
                          : best !== null
                            ? "bg-emerald-500/15 border border-emerald-400/50 text-emerald-300"
                            : "glass hover:border-amber-400/50"
                      }`}
                    >
                      {i + 1}
                      {locked && <span className="absolute -top-1 -right-1 text-[10px]">🔒</span>}
                      {best !== null && !locked && <span className="block text-[9px] font-bold opacity-70">{best}%</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {proNudge && (
              <div className="glass rounded-2xl p-5 w-full mb-4 border border-amber-400/40">
                <div className="font-bold mb-1">✨ Tests 11–50 are part of Pro</div>
                <p className="text-xs opacity-70 mb-3">
                  Unlimited test series, AI grading, career packs — ₹500/month, cancel anytime.
                </p>
                <Link href="/pro" className="btn-primary inline-block text-sm !py-2.5 !px-6">
                  Upgrade to Pro →
                </Link>
              </div>
            )}

            <button
              onClick={() => {
                const free = seriesTests.slice(0, isPro ? seriesTests.length : FREE_COUNT);
                if (free.length) pickSeries(free[Math.floor(Math.random() * free.length)], seriesTests.indexOf(free[0]));
              }}
              disabled={seriesTests.length === 0}
              className="btn-ghost w-full !py-3 text-sm mb-3 disabled:opacity-40"
            >
              🎲 Random test
            </button>
          </>
        )}

        <p className="text-xs opacity-50 mt-4">Browser mic needed for Sprechen. ~15–20 minutes per test.</p>
      </main>
    );
  }

  /* ─── done ─── */
  if (phase === "done") {
    const grade = overall >= 85 ? "Sehr gut! 🎉" : overall >= 60 ? "Bestanden ✅" : "Noch üben 💪";
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full text-center">
        <div className="text-6xl mb-4">🎓</div>
        <h1 className="text-3xl font-extrabold mb-1">Exam complete!</h1>
        <p className="opacity-70 text-sm mb-4">
          {examLabel} • {Math.floor(elapsed / 60)}m {elapsed % 60}s
        </p>
        <div className="glass rounded-3xl w-full p-6 mb-6">
          <div className="text-5xl font-extrabold german-gradient-text">{overall}%</div>
          <div className="text-sm opacity-70 mt-1">{grade}</div>
        </div>
        <div className="grid gap-3 w-full mb-6">
          {results.map((r) => (
            <div key={r.title} className="glass rounded-xl p-3 flex items-center justify-between">
              <div className="text-left text-sm font-semibold">{r.title}</div>
              <div className="text-xs opacity-70">{r.pct}%</div>
            </div>
          ))}
        </div>
        {speaking.rubric && (
          <div className="glass rounded-2xl w-full p-5 mb-6 text-left">
            <div className="text-xs font-bold tracking-widest opacity-60 mb-3">SPRECHEN — AI RUBRIC</div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div>🗣️ Fluency: {parseRatingOutOf5(speaking.rubric.fluency) ?? "—"}/5</div>
              <div>📚 Vocab: {parseRatingOutOf5(speaking.rubric.vocab) ?? "—"}/5</div>
              <div>✅ Accuracy: {parseRatingOutOf5(speaking.rubric.accuracy) ?? "—"}/5</div>
              <div>👄 Pronunciation: {parseRatingOutOf5(speaking.rubric.pronunciation) ?? "—"}/5</div>
            </div>
            {speaking.rubric.mistakes && <p className="text-xs opacity-70 whitespace-pre-line">Mistakes: {speaking.rubric.mistakes}</p>}
            {speaking.rubric.cefr && <p className="text-xs opacity-70 mt-1">Estimated level: {speaking.rubric.cefr}</p>}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={startExam} className="btn-primary !px-6 text-sm">
            🔁 Try again
          </button>
          <Link href="/practice" className="btn-ghost text-sm">
            ← Practice hub
          </Link>
        </div>
      </main>
    );
  }

  /* ─── exam: shared header ─── */
  const header = (
    <>
      <div className="w-full flex items-center justify-between mb-4">
        <button onClick={() => setPhase("setup")} className="text-sm opacity-70 hover:opacity-100">
          ← Quit
        </button>
        <div className="text-sm opacity-70">
          Part {partIdx + 1} / {parts.length} • {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </div>
        <div className="text-xs px-2 py-1 rounded-full bg-white/10">
          {examLabel}
        </div>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full mb-8 overflow-hidden">
        <div className="h-full german-gradient rounded-full transition-all" style={{ width: `${(partIdx / parts.length) * 100}%` }} />
      </div>
    </>
  );

  /* ─── lesen / horen ─── */
  if (part.kind === "lesen" || part.kind === "horen") {
    const idx = partIdx;
    const answers: Record<number, number> = {};
    for (let qi = 0; qi < part.questions.length; qi++) {
      const v = mcq[`${idx}:${qi}`];
      if (v !== undefined) answers[qi] = v;
    }
    const answered = Object.keys(answers).length;
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
        {header}
        <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
          <div className="text-xs font-bold tracking-widest opacity-60 mb-2">{part.title}</div>
          <h2 className="text-lg md:text-xl font-bold leading-snug mb-4">{part.instructionsEn}</h2>
          {part.kind === "lesen" ? (
            <div className="rounded-xl bg-white/5 p-4 text-sm leading-relaxed whitespace-pre-line">{part.text}</div>
          ) : (
            <div className="text-center">
              <button
                onClick={playHoren}
                disabled={horenPlaying || horenPlays >= 3}
                className="btn-primary !py-3 !px-8 text-sm disabled:opacity-50"
              >
                {horenPlaying ? "🔊 Playing…" : horenPlays === 0 ? "▶ Play audio" : `🔊 Replay (${3 - horenPlays} left)`}
              </button>
              <p className="text-xs opacity-50 mt-3">{horenPlays === 0 ? "Listen first — the text stays hidden." : "Max 3 plays, like the real exam."}</p>
            </div>
          )}
        </div>
        <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
          <McqBlock
            questions={part.questions}
            answers={answers}
            onPick={(qi, oi) => setMcq((m) => ({ ...m, [`${idx}:${qi}`]: oi }))}
          />
        </div>
        <button
          onClick={() => {
            const pct = partPctFor(part, idx) ?? 0;
            setPartPct((p) => ({ ...p, [idx]: pct }));
            nextPart();
          }}
          disabled={answered < part.questions.length}
          className="btn-primary w-full !py-4 disabled:opacity-40"
        >
          {answered < part.questions.length
            ? `Answer all (${answered}/${part.questions.length})`
            : partIdx + 1 >= parts.length
              ? "🎓 Finish & see results"
              : "Next part →"}
        </button>
      </main>
    );
  }

  /* ─── schreiben ─── */
  if (part.kind === "schreiben") {
    const words = written.trim() ? norm(written).split(" ").filter(Boolean).length : 0;
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
        {header}
        <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
          <div className="text-xs font-bold tracking-widest opacity-60 mb-2">{part.title}</div>
          <h2 className="text-lg md:text-xl font-bold leading-snug mb-3">{part.instructionsEn}</h2>
          <p className="text-sm leading-relaxed">{part.promptDe}</p>
          <p className="text-xs opacity-60 mt-2 italic">{part.promptEn}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {part.bullets.map((b) => (
              <span key={b} className="text-xs glass rounded-full px-3 py-1 opacity-80">
                ✓ {b}
              </span>
            ))}
          </div>
          <button
            onClick={() => speakSmart(part.promptDe, "de-DE", { genderHint: "lehrer", rate: 0.9 })}
            className="text-xs glass rounded-full px-3 py-1.5 mt-4"
          >
            🔊 Hear the task
          </button>
        </div>

        <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold tracking-widest opacity-60">YOUR TEXT</div>
            <div className="text-xs opacity-50">
              {words} / ~{part.wordTarget} words
            </div>
          </div>
          <textarea
            value={written}
            onChange={(e) => setWritten(e.target.value)}
            placeholder="Sehr geehrte Frau Maier, …"
            rows={8}
            className="w-full rounded-xl bg-white/5 border border-white/10 p-4 text-[15px] leading-relaxed outline-none focus:border-yellow-400/50"
          />
          {!writing.report && (
            <button onClick={gradeWriting} disabled={!written.trim() || writing.loading} className="btn-primary w-full !py-4 mt-4 disabled:opacity-40">
              {writing.loading ? "✨ AI examiner is grading…" : "✨ Submit for AI grading"}
            </button>
          )}
          {writing.error && <p className="text-xs text-yellow-400/90 mt-3">{writing.error}</p>}
          {writing.report && (
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-extrabold german-gradient-text">{writing.report.score || "—"}</span>
                <span className="text-xs opacity-60">/ 15 points</span>
              </div>
              {writing.report.task && <p className="opacity-80">📋 {writing.report.task}</p>}
              {writing.report.grammar && <p className="opacity-80 whitespace-pre-line">✏️ {writing.report.grammar}</p>}
              {writing.report.vocab && <p className="opacity-80">📚 {writing.report.vocab}</p>}
              {writing.report.fixes && (
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="text-xs font-bold opacity-60 mb-1">CORRECTED VERSION</div>
                  <p className="whitespace-pre-line">{writing.report.fixes}</p>
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={nextPart} className="btn-ghost w-full !py-4">
          {partIdx + 1 >= parts.length ? "🎓 Finish & see results" : writing.report || writing.error ? "Next part →" : "Skip grading & continue →"}
        </button>
      </main>
    );
  }

  /* ─── sprechen ─── */
  const task = part.tasks[taskIdx];
  const allAnswered = part.tasks.every((_, i) => spokenAll[i]);
  const kwHits = keywordScore(spoken, task.keywords);
  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
      {header}
      <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
        <div className="text-xs font-bold tracking-widest opacity-60 mb-2">
          {part.title} — Task {taskIdx + 1}/{part.tasks.length}
        </div>
        <h2 className="text-lg md:text-xl font-bold leading-snug mb-3">{task.instructionsEn}</h2>
        <button onClick={() => speakSmart(task.promptDe, "de-DE", { genderHint: "lehrer" })} className="text-xs glass rounded-full px-3 py-1.5">
          🔊 Hear the question
        </button>
        <p className="mt-4 text-sm opacity-60 italic">{task.promptDe}</p>
      </div>

      <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold tracking-widest opacity-60">YOUR ANSWER</div>
          <div className="text-xs opacity-50">
            keywords {kwHits}/{task.keywords.length} • {norm(spoken).split(" ").filter(Boolean).length} words
          </div>
        </div>
        <div className={`min-h-[80px] text-[15px] leading-relaxed rounded-xl bg-white/5 p-3 ${spoken ? "" : "opacity-50 italic"}`}>
          {spoken || "Tap 🎤 and answer in German."}
        </div>
        <button onClick={doListen} disabled={listening} className={`btn-primary w-full !py-4 mt-4 ${listening ? "opacity-60" : ""}`}>
          {listening ? "🎙️ Listening…" : "🎤 Speak"}
        </button>
        <div className="flex gap-2 mt-3">
          {part.tasks.map((t, i) => (
            <div key={t.id} className={`flex-1 h-1.5 rounded-full ${spokenAll[i] ? "german-gradient" : "bg-white/10"}`} />
          ))}
        </div>
      </div>

      {speaking.rubric && (
        <div className="glass rounded-2xl w-full p-5 mb-6 text-left text-sm">
          <div className="text-xs font-bold tracking-widest opacity-60 mb-3">AI RUBRIC</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>🗣️ {speaking.rubric.fluency}</div>
            <div>📚 {speaking.rubric.vocab}</div>
            <div>✅ {speaking.rubric.accuracy}</div>
            <div>👄 {speaking.rubric.pronunciation}</div>
          </div>
          {speaking.rubric.mistakes && <p className="text-xs opacity-70 whitespace-pre-line">Mistakes: {speaking.rubric.mistakes}</p>}
          {speaking.rubric.cefr && <p className="text-xs opacity-70 mt-1">Estimated: {speaking.rubric.cefr}</p>}
          {speaking.error && <p className="text-xs text-yellow-400/90 mt-2">{speaking.error}</p>}
        </div>
      )}
      {!speaking.rubric && speaking.error && <p className="text-xs text-yellow-400/90 mb-4">{speaking.error}</p>}

      {taskIdx + 1 < part.tasks.length ? (
        <button onClick={nextTask} disabled={!spoken} className="btn-primary w-full !py-4 disabled:opacity-40">
          {spoken ? "Next task →" : "Answer first"}
        </button>
      ) : !speaking.rubric && !speaking.loading ? (
        <button onClick={gradeSpeaking} disabled={!allAnswered} className="btn-primary w-full !py-4 disabled:opacity-40">
          {allAnswered ? "✨ Finish & get AI score" : "Answer all tasks first"}
        </button>
      ) : (
        <button onClick={nextPart} className="btn-ghost w-full !py-4">
          {partIdx + 1 >= parts.length ? "🎓 Finish & see results" : "Next part →"}
        </button>
      )}
      {speaking.loading && <p className="text-xs opacity-60 mt-3">✨ AI examiner is listening to your transcript…</p>}
      <button
        onClick={finishExam}
        className="text-xs opacity-50 hover:opacity-80 mt-6"
      >
        End exam & see results →
      </button>
    </main>
  );
}
