"use client";

/**
 * Analytics — exam readiness, skill trends and weak areas.
 * Reads local stores: exam attempts, grammar scores, SRS + progress.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getExamAttempts, type ExamAttempt } from "@/lib/examStore";
import { getProgress } from "@/lib/progress";

type Skill = "Lesen" | "Hören" | "Schreiben" | "Sprechen";

function classifyPart(title: string): Skill | null {
  const t = title.toLowerCase();
  if (t.startsWith("lesen")) return "Lesen";
  if (t.startsWith("hören") || t.startsWith("horen")) return "Hören";
  if (t.startsWith("schreiben")) return "Schreiben";
  if (t.startsWith("sprechen")) return "Sprechen";
  return null;
}

/** tiny inline SVG line chart */
function LineChart({ series, label }: { series: { x: number; y: number }[]; label: string }) {
  if (series.length < 2) {
    return <p className="text-xs opacity-50 py-4">{label}: not enough attempts yet (need 2+)</p>;
  }
  const w = 300;
  const h = 90;
  const pad = 6;
  const xs = series.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const px = (x: number) => pad + ((x - minX) / Math.max(1, maxX - minX)) * (w - 2 * pad);
  const py = (y: number) => h - pad - (y / 100) * (h - 2 * pad);
  const path = series.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(" ");
  const area = `${path} L${px(series[series.length - 1].x).toFixed(1)},${h - pad} L${px(series[0].x).toFixed(1)},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <path d={area} fill="rgba(245,158,11,0.12)" />
      <path d={path} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {series.map((p, i) => (
        <circle key={i} cx={px(p.x)} cy={py(p.y)} r="3" fill="#dc2626" />
      ))}
      <text x={pad} y={11} fontSize="9" fill="rgba(255,255,255,0.4)">{label}</text>
    </svg>
  );
}

export default function AnalyticsPage() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [grammarScores, setGrammarScores] = useState<Record<string, { correct: number; total: number }>>({});
  const [progress, setProgress] = useState<{ sessions: number; minutes: number; streak: number; wordsLearned: number } | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setAttempts(getExamAttempts());
      try {
        setGrammarScores(JSON.parse(localStorage.getItem("sprachdost_grammar_scores") ?? "{}"));
      } catch { /* fresh */ }
      setProgress(getProgress());
    });
  }, []);

  const skillTrend = useMemo(() => {
    const out: Partial<Record<Skill, { x: number; y: number }[]>> = {};
    const sorted = [...attempts].sort((a, b) => a.date - b.date);
    for (const a of sorted) {
      for (const p of a.perPart) {
        const skill = classifyPart(p.title);
        if (!skill) continue;
        (out[skill] ??= []).push({ x: a.date, y: Math.max(0, p.pct) });
      }
    }
    return out;
  }, [attempts]);

  const readiness = useMemo(() => {
    const recent = [...attempts].sort((a, b) => b.date - a.date).slice(0, 5);
    if (recent.length === 0) return null;
    const recency = recent.map((a, i) => a.overall * (1 - i * 0.1));
    return Math.round(recency.reduce((s, v) => s + v, 0) / recency.reduce((s, _, i) => s + (1 - i * 0.1), 0));
  }, [attempts]);

  const weakAreas = useMemo(() => {
    const acc: Record<string, { sum: number; n: number }> = {};
    for (const a of attempts) {
      for (const p of a.perPart) {
        const skill = classifyPart(p.title);
        if (!skill) continue;
        acc[skill] ??= { sum: 0, n: 0 };
        acc[skill].sum += Math.max(0, p.pct);
        acc[skill].n += 1;
      }
    }
    return Object.entries(acc)
      .map(([skill, v]) => ({ skill, avg: Math.round(v.sum / v.n), n: v.n }))
      .sort((a, b) => a.avg - b.avg);
  }, [attempts]);

  const grammarSummary = useMemo(() => {
    const byLevel: Record<string, { best: number; n: number }> = {};
    for (const [key, v] of Object.entries(grammarScores)) {
      const level = key.split("|")[0];
      const pct = Math.round((v.correct / Math.max(1, v.total)) * 100);
      byLevel[level] ??= { best: 0, n: 0 };
      byLevel[level].best = Math.max(byLevel[level].best, pct);
      byLevel[level].n += 1;
    }
    return byLevel;
  }, [grammarScores]);

  const srsStats = useMemo(() => {
    let due = 0;
    let learned = 0;
    try {
      const raw = JSON.parse(localStorage.getItem("sprachdost_srs") ?? "{}") as Record<string, { due: number; reps: number }>;
      for (const st of Object.values(raw)) {
        if (st.due <= Date.now()) due++;
        if (st.reps >= 1) learned++;
      }
    } catch { /* fresh */ }
    return { due, learned };
  }, []);

  const readinessLabel = readiness === null
    ? "Take your first mock to unlock your readiness score"
    : readiness >= 85 ? "Exam-ready — sehr gut!" : readiness >= 60 ? "On track — keep going" : "Needs work — practise daily";

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-3xl mx-auto w-full">
      <Link href="/practice" className="self-start text-sm opacity-70 hover:opacity-100 mb-6">← Practice hub</Link>

      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2">📈 Analytics</h1>
      <p className="opacity-70 text-center text-sm mb-8">Your exam readiness, skill trends and weak areas — all offline data.</p>

      {/* readiness */}
      <div className="glass rounded-3xl w-full p-6 mb-6 text-center">
        <div className="text-xs font-bold tracking-widest opacity-60 mb-2">EXAM READINESS</div>
        {readiness === null ? (
          <p className="text-sm opacity-70 py-2">{readinessLabel}</p>
        ) : (
          <>
            <div className="text-5xl font-extrabold german-gradient-text">{readiness}%</div>
            <p className="text-sm opacity-70 mt-1">{readinessLabel}</p>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden mt-4">
              <div className="h-full german-gradient rounded-full" style={{ width: `${readiness}%` }} />
            </div>
          </>
        )}
      </div>

      {/* skill trends */}
      <div className="glass rounded-3xl w-full p-6 mb-6">
        <div className="text-xs font-bold tracking-widest opacity-60 mb-4">SKILL TRENDS</div>
        <div className="grid sm:grid-cols-2 gap-5">
          {(["Lesen", "Hören", "Schreiben", "Sprechen"] as Skill[]).map((skill) => (
            <div key={skill}>
              <div className="text-sm font-bold mb-1">{skill}</div>
              <LineChart series={skillTrend[skill] ?? []} label={skill} />
            </div>
          ))}
        </div>
        {attempts.length === 0 && (
          <p className="text-xs opacity-50 mt-3">Finish a few exam mocks (or test-series tests) to see your trends.</p>
        )}
      </div>

      {/* weak areas */}
      {weakAreas.length > 0 && (
        <div className="glass rounded-3xl w-full p-6 mb-6">
          <div className="text-xs font-bold tracking-widest opacity-60 mb-3">WEAK AREAS</div>
          <div className="space-y-2">
            {weakAreas.map((w) => (
              <div key={w.skill} className="flex items-center justify-between text-sm">
                <span className="font-semibold">{w.skill}</span>
                <span className={`font-extrabold ${w.avg < 50 ? "text-red-300" : w.avg < 70 ? "text-amber-300" : "text-emerald-300"}`}>
                  {w.avg}% avg ({w.n})
                </span>
              </div>
            ))}
          </div>
          <Link href="/practice/exam" className="btn-ghost inline-block text-sm mt-4 !py-2.5 !px-5">
            Practise weakest part →
          </Link>
        </div>
      )}

      {/* grammar + srs + totals */}
      <div className="grid sm:grid-cols-3 gap-4 w-full">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-bold tracking-widest opacity-60 mb-2">GRAMMAR</div>
          {Object.keys(grammarSummary).length === 0 ? (
            <p className="text-xs opacity-50">No quizzes yet</p>
          ) : (
            Object.entries(grammarSummary).map(([lvl, v]) => (
              <div key={lvl} className="flex justify-between text-sm">
                <span>{lvl}</span>
                <span className="font-bold text-amber-300">{v.best}% • {v.n} topics</span>
              </div>
            ))
          )}
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-bold tracking-widest opacity-60 mb-2">FLASHCARDS (SRS)</div>
          <div className="flex justify-between text-sm"><span>Learned</span><span className="font-bold text-emerald-300">{srsStats.learned}</span></div>
          <div className="flex justify-between text-sm"><span>Due now</span><span className="font-bold text-amber-300">{srsStats.due}</span></div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-bold tracking-widest opacity-60 mb-2">TOTALS</div>
          <div className="flex justify-between text-sm"><span>Sessions</span><span className="font-bold">{progress?.sessions ?? 0}</span></div>
          <div className="flex justify-between text-sm"><span>Minutes</span><span className="font-bold">{progress?.minutes ?? 0}</span></div>
          <div className="flex justify-between text-sm"><span>Streak</span><span className="font-bold">{progress?.streak ?? 0}🔥</span></div>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <Link href="/practice/exam" className="btn-primary text-sm">🎓 Take a mock →</Link>
        <Link href="/practice" className="btn-ghost text-sm">← Practice hub</Link>
      </div>
    </main>
  );
}
