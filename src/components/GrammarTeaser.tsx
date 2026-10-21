"use client";

import { useState } from "react";

type Q = { q: string; options: string[]; answer: number; why?: string };

/** interactive 3-question teaser on public grammar pages */
export default function GrammarTeaser({ questions }: { questions: Q[] }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const allAnswered = Object.keys(picked).length === questions.length;
  const score = questions.filter((q, i) => picked[i] === q.answer).length;

  return (
    <div className="space-y-6">
      {questions.map((q, qi) => (
        <div key={qi}>
          <div className="text-sm font-bold mb-2">{qi + 1}. {q.q}</div>
          <div className="grid gap-2">
            {q.options.map((opt, oi) => {
              const chosen = picked[qi] === oi;
              const show = picked[qi] !== undefined;
              let cls = "glass hover:border-amber-400/50";
              if (show) {
                if (oi === q.answer) cls = "border-emerald-400/70 bg-emerald-500/15";
                else if (chosen) cls = "border-red-400/70 bg-red-500/15";
                else cls = "opacity-40";
              }
              return (
                <button
                  key={oi}
                  onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                  disabled={show}
                  className={`text-left text-sm rounded-xl px-4 py-2.5 border border-white/10 transition-all ${cls}`}
                >
                  {String.fromCharCode(65 + oi)}. {opt}
                </button>
              );
            })}
          </div>
          {picked[qi] !== undefined && q.why && (
            <p className="text-xs opacity-60 mt-1.5">💡 {q.why}</p>
          )}
        </div>
      ))}
      {allAnswered && (
        <div className="rounded-2xl bg-amber-400/10 border border-amber-400/30 p-4 text-center">
          <div className="font-extrabold text-amber-300">{score}/{questions.length} richtig!</div>
          <p className="text-xs opacity-70 mt-1">In the app: 400+ questions per topic, spaced repetition and AI feedback.</p>
        </div>
      )}
    </div>
  );
}
