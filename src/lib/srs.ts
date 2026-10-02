/**
 * Spaced repetition engine — SM-2 algorithm (same family as Anki).
 * Stores per-word review state in localStorage: ease, interval, repetitions, due date.
 */

export type CardState = {
  ease: number;      // easiness factor (default 2.5)
  interval: number;  // days
  reps: number;      // successful repetitions in a row
  lapses: number;    // times forgotten
  due: number;       // timestamp (ms) when next due
};

const KEY = "sprachdost_srs";
const DAY = 24 * 60 * 60 * 1000;

type Store = Record<string, CardState>;

function load(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

function save(s: Store) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function getCardState(id: string): CardState {
  const store = load();
  return store[id] ?? { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: 0 };
}

export function isNew(id: string): boolean {
  return !(id in load());
}

/**
 * Grade: 1 = Again (forgot), 3 = Hard, 4 = Good, 5 = Easy
 * Returns the updated card state.
 */
export function gradeCard(id: string, grade: number): CardState {
  const store = load();
  let c = store[id] ?? { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: 0 };

  if (grade < 3) {
    c = { ...c, reps: 0, lapses: c.lapses + 1, interval: 0 }; // again today
    c.due = Date.now() + 10 * 60 * 1000; // review again in 10 minutes
  } else {
    c.reps += 1;
    if (c.reps === 1) c.interval = 1;
    else if (c.reps === 2) c.interval = 3;
    else c.interval = Math.round(c.interval * c.ease);
    c.ease = Math.max(1.3, c.ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
    c.due = Date.now() + c.interval * DAY;
  }

  store[id] = c;
  save(store);
  return c;
}

/** ids due right now (for review session) */
export function dueCards(ids: string[]): string[] {
  const store = load();
  const now = Date.now();
  return ids.filter((id) => store[id] && store[id].due <= now);
}

/** count of learned words (graded at least once) from a set of ids */
export function learnedCount(ids: string[]): number {
  const store = load();
  return ids.filter((id) => store[id] && store[id].reps > 0).length;
}

export function fullStats(ids: string[]): { learned: number; due: number; new: number } {
  const store = load();
  const now = Date.now();
  let learned = 0, due = 0, fresh = 0;
  for (const id of ids) {
    const c = store[id];
    if (!c) fresh++;
    else {
      if (c.reps > 0) learned++;
      if (c.due <= now) due++;
    }
  }
  return { learned, due, new: fresh };
}
