"use client";

/**
 * Exam countdown + daily study plan card.
 * Without a goal: compact setup form (exam, level, date).
 * With a goal: countdown chip + today's plan tasks (built from real data).
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadAllWords } from "@/lib/vocabStore";
import {
  buildStudyPlan, setExamGoal, clearExamGoal,
  type StudyPlan as Plan,
} from "@/lib/studyPlan";

const EXAMS = ["Goethe", "telc", "ÖSD"];
const LEVELS = ["A1", "A2", "B1"];

export default function StudyPlan() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [exam, setExam] = useState("Goethe");
  const [level, setLevel] = useState("A1");
  const [date, setDate] = useState("");

  const rebuild = () => {
    void loadAllWords().then((words) => {
      setPlan(buildStudyPlan(words));
      setLoaded(true);
    });
  };

  useEffect(() => {
    rebuild();
  }, []);

  const save = () => {
    if (!date) return;
    setExamGoal({ exam, level, date });
    rebuild();
  };

  if (!loaded) return null;

  /* ── setup form ── */
  if (!plan) {
    return (
      <div className="glass rounded-3xl p-6 w-full max-w-3xl mt-8">
        <h3 className="font-bold text-lg mb-1">📅 When is your German exam?</h3>
        <p className="text-sm opacity-60 mb-4">
          Set your exam date — we build you a personal study plan every day from your weak areas.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch">
          <select value={exam} onChange={(e) => setExam(e.target.value)} className="rounded-xl px-3 py-2.5 bg-white/8 border border-white/15 text-sm outline-none">
            {EXAMS.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-xl px-3 py-2.5 bg-white/8 border border-white/15 text-sm outline-none">
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2.5 bg-white/8 border border-white/15 text-sm outline-none focus:border-amber-400"
          />
          <button onClick={save} disabled={!date} className="btn-primary text-sm !py-2.5 disabled:opacity-50">
            Set goal 🎯
          </button>
        </div>
      </div>
    );
  }

  /* ── plan card ── */
  return (
    <div className="glass rounded-3xl p-6 w-full max-w-3xl mt-8 border border-amber-400/30">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="font-bold text-lg">
          📅 Your plan for today — {plan.goal.exam} {plan.goal.level}
        </h3>
        <span className={`text-xs font-extrabold px-3 py-1.5 rounded-full ${
          plan.daysLeft <= 7 ? "bg-red-500/20 text-red-300" : "bg-amber-400/20 text-amber-300"
        }`}>
          {plan.daysLeft === 0 ? "🔥 EXAM TODAY" : `${plan.daysLeft} days left`}
        </span>
      </div>

      <div className="space-y-2.5">
        {plan.tasks.map((t, i) => (
          <Link
            key={i}
            href={t.href}
            className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 hover:border-amber-400/40 hover:scale-[1.01] transition-all"
          >
            <span className="text-2xl">{t.icon}</span>
            <span className="flex-1 text-left">
              <span className="block text-sm font-semibold">{t.label}</span>
              {t.why && <span className="block text-xs opacity-60">{t.why}</span>}
            </span>
            <span className="text-xs opacity-50 whitespace-nowrap">Start →</span>
          </Link>
        ))}
      </div>

      <button
        onClick={() => { clearExamGoal(); setPlan(null); }}
        className="text-xs opacity-50 hover:opacity-100 underline mt-4"
      >
        Change / remove exam goal
      </button>
    </div>
  );
}
