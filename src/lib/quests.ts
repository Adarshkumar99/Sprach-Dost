/**
 * Daily quests — 3 rotating quests per IST day, tracked in localStorage.
 * Quests reward bonus XP and are fed by the same hooks that award XP
 * (flashcards, grammar answers, dictations, speed games, speaking sessions).
 */
import { awardXp } from "./xp";

const KEY = "sprachdost_quests";

export type QuestType = "words" | "grammar" | "dictation" | "games" | "speaking";

export type Quest = {
  type: QuestType;
  icon: string;
  label: string;
  target: number;
  reward: number;
};

const POOL: Quest[] = [
  { type: "words", icon: "📇", label: "Learn {n} new words", target: 10, reward: 20 },
  { type: "grammar", icon: "📐", label: "Answer {n} grammar questions", target: 15, reward: 20 },
  { type: "dictation", icon: "🎧", label: "Complete {n} dictations", target: 2, reward: 20 },
  { type: "games", icon: "🃏", label: "{n} correct speed-game answers", target: 20, reward: 20 },
  { type: "speaking", icon: "🗣️", label: "Finish {n} speaking session", target: 1, reward: 25 },
];

type QuestState = {
  day: string;
  progress: Partial<Record<QuestType, number>>;
  completed: QuestType[];
};

function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function load(): QuestState {
  if (typeof window === "undefined") return { day: "", progress: {}, completed: [] };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw?.day === today()) return raw as QuestState;
  } catch { /* noop */ }
  return { day: today(), progress: {}, completed: [] };
}

function save(s: QuestState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
}

/** deterministic pick of 3 quests per day (rotates through the pool) */
export function getDailyQuests(): Quest[] {
  const day = today();
  const dayNum = Number(day.replaceAll("-", "")) || 0;
  const start = dayNum % POOL.length;
  return [0, 1, 2].map((i) => POOL[(start + i * 2) % POOL.length]);
}

export function questProgress(): { quest: Quest; done: number; complete: boolean }[] {
  const state = load();
  return getDailyQuests().map((q) => {
    const done = Math.min(state.progress[q.type] ?? 0, q.target);
    return { quest: q, done, complete: state.completed.includes(q.type) };
  });
}

/** Record activity towards quests. Auto-awards XP when a quest completes. */
export function recordQuestActivity(type: QuestType, n = 1) {
  const state = load();
  if (state.completed.includes(type)) return;
  const quest = getDailyQuests().find((q) => q.type === type);
  if (!quest) return; // not one of today's quests
  state.progress[type] = (state.progress[type] ?? 0) + n;
  if (state.progress[type]! >= quest.target) {
    state.completed.push(type);
    awardXp("quest", quest.reward);
  }
  save(state);
}

/** number of today's quests completed (for streak-style badges) */
export function questsDoneToday(): number {
  return load().completed.length;
}
