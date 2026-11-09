/**
 * Exam-date study plan — deterministic daily plan built from the learner's
 * real data (SRS due cards, weakest grammar topics, weakest exam parts).
 * Zero AI cost; regenerates on every load.
 */

import { fullStats } from "./srs";
import { vocabId, type VocabWord } from "./vocab";
import { getExamAttempts } from "./examStore";

const GOAL_KEY = "sprachdost_exam_goal";

export type ExamGoal = {
  exam: string;  // "Goethe" | "telc" | "ÖSD"
  level: string; // A1..B1
  date: string;  // YYYY-MM-DD
};

export function getExamGoal(): ExamGoal | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = JSON.parse(localStorage.getItem(GOAL_KEY) ?? "null");
    if (raw?.date && raw?.level) return raw as ExamGoal;
  } catch { /* noop */ }
  return null;
}

export function setExamGoal(goal: ExamGoal) {
  localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
}

export function clearExamGoal() {
  localStorage.removeItem(GOAL_KEY);
}

export function daysUntil(date: string): number {
  const target = new Date(`${date}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((target - today.getTime()) / 86400000));
}

type GrammarScores = Record<string, { correct: number; total: number; when: number }>;

function weakestGrammar(limit = 2): { level: string; topicId: string; pct: number }[] {
  try {
    const scores: GrammarScores = JSON.parse(localStorage.getItem("sprachdost_grammar_scores") ?? "{}");
    return Object.entries(scores)
      .filter(([, s]) => s.total >= 5)
      .map(([k, s]) => {
        const [level, topicId] = k.split("|");
        return { level, topicId, pct: Math.round((s.correct / s.total) * 100) };
      })
      .sort((a, b) => a.pct - b.pct)
      .slice(0, limit);
  } catch {
    return [];
  }
}

function weakestExamPart(): { title: string; pct: number; level: string } | null {
  const attempts = getExamAttempts();
  if (attempts.length === 0) return null;
  const latest = attempts[0]; // newest first (store keeps sorted)
  const worst = [...latest.perPart].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))[0];
  if (!worst) return null;
  return { title: worst.title, pct: worst.pct ?? 0, level: latest.level };
}

export type PlanTask = {
  icon: string;
  label: string;
  href: string;
  why?: string;
};

export type StudyPlan = {
  daysLeft: number;
  goal: ExamGoal;
  tasks: PlanTask[];
};

/** Build today's plan from real learner data. Returns null when no exam goal set. */
export function buildStudyPlan(words: VocabWord[]): StudyPlan | null {
  const goal = getExamGoal();
  if (!goal) return null;
  const daysLeft = daysUntil(goal.date);
  const tasks: PlanTask[] = [];

  // 1) SRS review — the single highest-yield task before an exam
  const stats = fullStats(words.map(vocabId));
  if (stats.due > 0) {
    tasks.push({
      icon: "📇",
      label: `Review ${Math.min(stats.due, 30)} due flashcards`,
      href: "/vocab",
      why: "spaced repetition — right before you forget",
    });
  }

  // 2) weakest grammar topic(s)
  for (const g of weakestGrammar()) {
    tasks.push({
      icon: "📐",
      label: `Grammar drill: ${g.topicId.replaceAll("-", " ")} (${g.level})`,
      href: "/grammar",
      why: `your weakest topic — ${g.pct}% correct`,
    });
    if (tasks.length >= 4) break;
  }

  // 3) weakest exam skill from the latest mock
  const part = weakestExamPart();
  if (part) {
    const href = /schreiben/i.test(part.title) ? "/writing" : "/practice/exam";
    tasks.push({
      icon: /sprechen/i.test(part.title) ? "🗣️" : /schreiben/i.test(part.title) ? "✍️" : "🎓",
      label: `${part.title} practice (${part.level})`,
      href,
      why: `last mock: ${part.pct}% — lowest skill`,
    });
  }

  // 4) listening every day
  tasks.push({ icon: "🎧", label: "1 dictation exercise", href: "/dictation", why: "trains Hören + spelling" });

  // 5) exam close → full mock
  if (daysLeft <= 7) {
    tasks.unshift({
      icon: "🎓",
      label: "Take a full mock exam",
      href: "/practice/exam",
      why: daysLeft === 0 ? "exam is TODAY — warm-up mock" : `only ${daysLeft} days left`,
    });
  }

  return { daysLeft, goal, tasks: tasks.slice(0, 5) };
}
