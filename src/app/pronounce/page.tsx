"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { speakSmart, listen, norm } from "@/lib/speech";
import { recordWeekly } from "@/lib/weekly";
import { loadAllWords } from "@/lib/vocabStore";

/* pick random words from loaded packs (client-side only) */

export default function PronouncePage() {
  const [level, setLevel] = useState<string>("A1");
  const [words, setWords] = useState<{ de: string; en: string }[]>([]);
  const [targetIdx, setTargetIdx] = useState(0);
  const [heard, setHeard] = useState("");
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<"idle" | "correct" | "retry">("idle");
  const [bestStreak, setBestStreak] = useState(0);
  const [streak, setStreak] = useState(0);

  /* load words according to level, from static/generated banks */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const all = await loadAllWords();
        const filtered = all.filter((w) => w.level === level);
        if (alive) setWords(filtered.map((w) => ({ de: w.de, en: w.en })));
      } catch { /* noop */ }
    })();
    return () => { alive = false; };
  }, [level]);

  const current = words[targetIdx % Math.max(1, words.length)];

  const promptNow = useCallback(async () => {
    if (!current) return;
    speakSmart(current.de, "de-DE", { genderHint: "anna", rate: 0.85 });
  }, [current]);

  const tryIt = useCallback(async () => {
    if (!current) return;
    setListening(true);
    setHeard("");
    try {
      const r = await listen("de-DE", { maxMs: 12000 });
      setHeard(r.text);
      const hit = norm(r.text).includes(norm(current.de));
      if (hit) {
        setResult("correct");
        setStreak((s) => {
          const n = s + 1;
          setBestStreak((b) => Math.max(b, n));
          return n;
        });
        recordWeekly({ pronCorrect: 1 });
      } else {
        setResult("retry");
        setStreak(0);
      }
    } catch { /* cancelled */ }
    setListening(false);
  }, [current]);

  const next = useCallback(() => {
    setTargetIdx((i) => i + 1);
    setHeard("");
    setResult("idle");
  }, []);

  const scoreColor = result === "idle" ? "" : result === "correct" ? "text-emerald-300" : "text-red-300";

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full">
      <Link href="/practice" className="self-start text-sm opacity-70 hover:opacity-100 mb-6">← Practice hub</Link>

      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2">🔊 Pronunciation Trainer</h1>
      <p className="opacity-70 text-center text-sm mb-8">
        Hear it → repeat it. Chrome/Edge checks your pronunciation live.
      </p>

      {/* level chips */}
      <div className="flex gap-2 mb-6">
        {(["A1","A2","B1"] as const).map((l) => (
          <button
            key={l}
            onClick={() => { setLevel(l); setTargetIdx(0); setHeard(""); setResult("idle"); setStreak(0); }}
            className={`px-5 h-10 rounded-xl font-extrabold transition-all ${
              level === l ? "german-gradient text-black shadow-lg scale-105" : "glass opacity-60 hover:opacity-100"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="glass rounded-3xl w-full p-6 md:p-8 text-center">
        <div className="text-xs font-bold tracking-widest opacity-60 mb-3">REPEAT AFTER ME</div>
        <div className="text-4xl md:text-5xl font-extrabold text-amber-300 mb-2">{current?.de ?? "…"}</div>
        <div className="opacity-60 text-sm mb-6">{current?.en}</div>

        <div className="flex gap-3 justify-center mb-6">
          <button onClick={promptNow} className="btn-ghost text-sm !px-5">🔊 Listen</button>
          <button
            onClick={tryIt}
            disabled={listening || !current}
            className={`btn-primary text-sm !px-6 ${listening ? "opacity-60" : ""}`}
          >
            {listening ? "🎙️ Listening…" : "🎤 Repeat"}
          </button>
        </div>

        <div className="text-sm opacity-60 mb-2 min-h-[20px]">{heard ? `You said: "${heard}"` : ""}</div>
        <div className={`text-base font-extrabold ${scoreColor}`}>
          {result === "correct" ? "✅ Perfect!" : result === "retry" ? "🔴 Try again" : ""}
        </div>

        <button onClick={next} className="btn-ghost w-full mt-6 !py-3">Next word →</button>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full mt-6">
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xl font-extrabold text-amber-300">{streak}</div>
          <div className="text-xs opacity-60">Current streak</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xl font-extrabold text-emerald-300">{bestStreak}</div>
          <div className="text-xs opacity-60">Best streak</div>
        </div>
      </div>
    </main>
  );
}
