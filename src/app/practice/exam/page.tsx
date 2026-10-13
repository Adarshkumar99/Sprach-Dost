"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { speakSmart, listen, keywordScore, norm } from "@/lib/speech";
import { recordSession } from "@/lib/progress";
import { recordWeekly } from "@/lib/weekly";

type Phase = "setup" | "exam" | "done";
type Level = "A1" | "A2";

/* ── Goethe-style exam tasks ── */
type Task = {
  id: string;
  title: string;
  instructionsEn: string;
  promptDe: string;        // what examiner says aloud
  keywords: string[];      // we check for these in your answer
  minWords: number;        // rough length target
};

const TASK_BANK: Record<Level, Task[]> = {
  A1: [
    { id: "a1-intro", title: "Teil 1 — Introduce yourself", instructionsEn: "Say who you are, where you live, your job/studies, and one hobby.",
      promptDe: "Stellen Sie sich bitte vor. Wie heißen Sie, woher kommen Sie, was machen Sie beruflich und was machen Sie gern?",
      keywords: ["ich", "heiße", "wohne", "komme", "bin", "arbeite", "studiere", "gern", "möchte"],
      minWords: 6 },
    { id: "a1-travel", title: "Teil 1 — Travel & food", instructionsEn: "Say what you ate today, when, and one thing you'll do tomorrow.",
      promptDe: "Was haben Sie heute gegessen? Wann? Und was machen Sie morgen?",
      keywords: ["heute", "gegessen", "getrunken", "morgen", "gestern", "uhr"],
      minWords: 5 },
    { id: "a1-day", title: "Teil 1 — Daily routine", instructionsEn: "Describe your day: wake up, work, evening.",
      promptDe: "Erzählen Sie von Ihrem Tag. Wann stehen Sie auf? Was machen Sie den ganzen Tag?",
      keywords: ["morgens", "aufstehe", "arbeite", "esse", "abends", "uhr"],
      minWords: 6 },
    { id: "a2-topics", title: "Teil 2 — Picture card", instructionsEn: "Pick one and answer the question with details.",
      promptDe: "Beschreiben Sie ein Bild. Was sehen Sie? Wer ist da? Was passiert?",
      keywords: ["das", "ist", "sind", "sehe", "und", "oder", "zeigt"],
      minWords: 6 },
    { id: "a2-opinion", title: "Teil 3 — Opinion/advice", instructionsEn: "Tell your partner if it's a good idea and why/why not.",
      promptDe: "Ich möchte nach Deutschland ziehen. Was denken Sie? Gute Idee?",
      keywords: ["ich denke", "finde", "weil", "aber", "vielleicht", "meiner meinung"],
      minWords: 7 },
  ],
  A2: [
    { id: "a2-past", title: "Teil 1 — Past experience", instructionsEn: "Tell us about something that happened recently in your life.",
      promptDe: "Erzählen Sie von einem Erlebnis letzte Woche. Was ist passiert?",
      keywords: ["gestern", "letzte woche", "war", "habe", "ging", "gegangen", "gemacht"],
      minWords: 8 },
    { id: "a2-plan", title: "Teil 2 — Future plans", instructionsEn: "Talk about a plan you have for next weekend or a trip.",
      promptDe: "Was haben Sie nächstes Wochenende vor? Erzählen Sie mir von Ihrem Plan.",
      keywords: ["nächstes wochenende", "werde", "möchte", "plane", "gehen", "besuchen"],
      minWords: 7 },
    { id: "a2-compare", title: "Teil 2 — Compare options", instructionsEn: "Compare two things (e.g. living in city vs village, two jobs) and say which you prefer.",
      promptDe: "Vergleichen Sie zwei Optionen. Zum Beispiel Stadt vs Dorf. Welche finden Sie besser?",
      keywords: ["lieber", "besser", "als", "weil", "aber", "deshalb"],
      minWords: 8 },
    { id: "a2-help", title: "Teil 3 — Ask for help", instructionsEn: "Your colleague is sick. Ask your boss for a favour or advice.",
      promptDe: "Mein Kollege ist krank. Können Sie mir helfen? Was soll ich tun?",
      keywords: ["können sie", "können", "helfen", "tut mir leid", "vielleicht", "wenn"],
      minWords: 6 },
  ],
};

export default function ExamPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [level, setLevel] = useState<Level>("A1");
  const [taskIdx, setTaskIdx] = useState(0);
  const [spoken, setSpoken] = useState("");
  const [listening, setListening] = useState(false);
  const [finishedTasks, setFinishedTasks] = useState<Record<string, { hits: number; totalKw: number; words: number }>>({});

  const tasks = useMemo(() => TASK_BANK[level], [level]);
  const task = tasks[taskIdx];

  useEffect(() => { if (task) speakSmart(task.promptDe, "de-DE", { genderHint: "lehrer", rate: 0.9 }); }, [task]);

  const doListen = useCallback(async () => {
    setListening(true); setSpoken("");
    try {
      const r = await listen("de-DE", { maxMs: 25000, onInterim: (t) => setSpoken(t) });
      setSpoken(r.text);
      const hits = keywordScore(r.text, task.keywords);
      const words = norm(r.text).split(" ").filter(Boolean).length;
      setFinishedTasks((p) => ({ ...p, [task.id]: { hits, totalKw: task.keywords.length, words } }));
    } catch { /* mic cancelled */ }
    setListening(false);
  }, [task]);

  const nextTask = useCallback(() => {
    if (taskIdx + 1 >= tasks.length) {
      recordWeekly({ examMinutes: Math.max(1, tasks.length * 2) });
      recordSession({ minutes: Math.max(1, tasks.length * 2), words: 0, level });
      setPhase("done");
    } else {
      setTaskIdx((i) => i + 1);
      setSpoken("");
    }
  }, [taskIdx, tasks.length, level]);

  /* ─── done ─── */
  if (phase === "done") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-2xl mx-auto w-full text-center">
        <div className="text-6xl mb-4">🎓</div>
        <h1 className="text-3xl font-extrabold mb-2">Exam complete!</h1>
        <p className="opacity-70 mb-6">Level {level} • {tasks.length} tasks</p>
        <div className="grid gap-3 w-full mb-8">
          {tasks.map((t) => {
            const r = finishedTasks[t.id];
            const pctKw = r ? Math.round((r.hits / r.totalKw) * 100) : 0;
            return (
              <div key={t.id} className="glass rounded-xl p-3 flex items-center justify-between">
                <div className="text-left text-sm font-semibold">{t.title}</div>
                <div className="text-xs opacity-70">{r ? `keywords ${r.hits}/${r.totalKw} (${pctKw}%)` : "—"}</div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setTaskIdx(0); setSpoken(""); setFinishedTasks({}); setPhase("setup"); }} className="btn-primary !px-6 text-sm">🔁 Try again</button>
          <Link href="/practice" className="btn-ghost text-sm">← Practice hub</Link>
        </div>
      </main>
    );
  }

  /* ─── exam ─── */
  if (phase === "exam" && task) {
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="w-full flex items-center justify-between mb-6">
          <button onClick={() => setPhase("setup")} className="text-sm opacity-70 hover:opacity-100">← Quit</button>
          <div className="text-sm opacity-70">{taskIdx + 1} / {tasks.length}</div>
          <div className="text-xs px-2 py-1 rounded-full bg-white/10">{level} Mock</div>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div className="h-full german-gradient rounded-full transition-all" style={{ width: `${(taskIdx / tasks.length) * 100}%` }} />
        </div>

        <div className="glass rounded-3xl w-full p-6 md:p-8 mb-6">
          <div className="text-xs font-bold tracking-widest opacity-60 mb-2">{task.title}</div>
          <h2 className="text-lg md:text-xl font-bold leading-snug mb-3">{task.instructionsEn}</h2>
          <button onClick={() => speakSmart(task.promptDe, "de-DE", { genderHint: "lehrer" })} className="text-xs glass rounded-full px-3 py-1.5">🔊 Hear the question</button>
          <p className="mt-4 text-sm opacity-60 italic">{task.promptDe}</p>
        </div>

        <div className="glass rounded-3xl w-full p-6 md:p-8">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold tracking-widest opacity-60">YOUR ANSWER</div>
            <div className="text-xs opacity-50">{spoken ? `${norm(spoken).split(" ").filter(Boolean).length} words` : "tap mic to speak"}</div>
          </div>
          <div className={`min-h-[80px] text-[15px] leading-relaxed rounded-xl bg-white/5 p-3 ${spoken ? "" : "opacity-50 italic"}`}>
            {spoken || "Tap 🎤 and answer in German — we'll listen for key grams."}
          </div>
          <button
            onClick={doListen}
            disabled={listening}
            className={`btn-primary w-full !py-4 mt-4 ${listening ? "opacity-60" : ""}`}
          >
            {listening ? "🎙️ Listening…" : "🎤 Speak"}
          </button>
          <div className="flex gap-3 mt-4">
            <button onClick={nextTask} className="btn-ghost flex-1 !py-3 text-sm">Next task →</button>
          </div>
        </div>

        <p className="text-xs opacity-50 mt-6 text-center">Rough beginner-level keyword check. Goethe format familiarity is the goal.</p>
      </main>
    );
  }

  /* ─── setup ─── */
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full text-center">
      <Link href="/practice" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100">← Back</Link>
      <div className="text-6xl mb-4">🎓</div>
      <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Speaking Exam Simulator</h1>
      <p className="opacity-70 text-sm mb-8">
        Goethe-style speaking tasks at {level}. Hear the question → speak your answer → instant keyword feedback.
      </p>

      <div className="flex gap-2 mb-6">
        {(["A1", "A2"] as const).map((l) => (
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
        {TASK_BANK[level].map((t, i) => (
          <div key={t.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
            <div className="text-sm font-semibold">{t.title}</div>
            <div className="text-xs opacity-60">{i + 1}</div>
          </div>
        ))}
      </div>

      <button onClick={() => setPhase("exam")} className="btn-primary !py-4 !px-10 w-full">
        🎤 Start simulated exam →
      </button>
      <p className="text-xs opacity-50 mt-4">Browser mic needed. ~{TASK_BANK[level].length * 2} minutes.</p>
    </main>
  );
}
