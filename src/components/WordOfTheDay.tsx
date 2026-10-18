"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadAllWords } from "@/lib/vocabStore";
import type { VocabWord } from "@/lib/vocab";
import { speakSmart } from "@/lib/speech";

/** deterministic word of the day from the whole bank (IST date as the seed) */
function pickWordOfTheDay(words: VocabWord[]): VocabWord | null {
  if (words.length === 0) return null;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  let h = 0;
  for (const ch of today) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return words[h % words.length];
}

export default function WordOfTheDay() {
  const [word, setWord] = useState<VocabWord | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const all = await loadAllWords();
      if (alive) setWord(pickWordOfTheDay(all));
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!word) return null;

  return (
    <div className="glass rounded-3xl p-6 w-full max-w-4xl mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-lg">🌟 Word of the Day</div>
        <div className="text-xs opacity-60">{new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}</div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold text-amber-300">{word.de}</span>
            <button
              onClick={() => speakSmart(word.de, "de-DE", { rate: 0.85 })}
              className="text-xs glass rounded-full px-3 py-1.5 hover:bg-white/10"
            >
              🔊
            </button>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10">{word.level}</span>
          </div>
          <p className="text-sm opacity-80 mt-1">{word.en}</p>
          {word.ex && (
            <p className="text-xs opacity-60 mt-2 italic">
              {word.ex} {word.exEn && <span className="opacity-70">— {word.exEn}</span>}
            </p>
          )}
        </div>
        <Link
          href={`/vocab?level=${word.level}`}
          className="btn-ghost text-sm whitespace-nowrap self-center"
        >
          Train it in flashcards →
        </Link>
      </div>
    </div>
  );
}
