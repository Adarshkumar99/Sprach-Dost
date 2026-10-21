import Link from "next/link";
import type { Metadata } from "next";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ShareData = {
  overall: number;
  level: string;
  label: string;
  perPart: { title: string; pct: number }[];
  rubric?: { fluency: number; vocab: number; accuracy: number; pronunciation: number; cefr: string };
  name: string;
};

let admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!admin) admin = createClient(url, key, { auth: { persistSession: false } });
  return admin;
}

async function getResult(id: string): Promise<ShareData | null> {
  const sb = getAdmin();
  if (!sb) return null;
  const { data } = await sb.from("shared_results").select("data").eq("id", id).maybeSingle();
  return (data?.data as ShareData) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getResult(id);
  if (!result) return { title: "Result — SprachDost" };
  const title = `${result.name} scored ${result.overall}% on ${result.label} 🇩🇪`;
  return {
    title,
    description: `Can you beat ${result.overall}%? Practise German speaking, vocab, grammar and full Goethe-style mocks free on SprachDost.`,
    openGraph: { title, type: "website" },
  };
}

export default async function SharedResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getResult(id);

  if (!result) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-2xl font-extrabold mb-2">Result not found</h1>
        <p className="opacity-70 text-sm mb-6">This share link is invalid or expired.</p>
        <Link href="/practice" className="btn-primary text-sm">🎓 Start your own German exam →</Link>
      </main>
    );
  }

  const grade = result.overall >= 85 ? "Sehr gut! 🎉" : result.overall >= 60 ? "Bestanden ✅" : "Fleißig üben 💪";

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-xl mx-auto w-full text-center">
      <p className="text-xs font-bold tracking-widest opacity-50 mb-6">SPRACHDOST — INDIA WILL SPEAK GERMAN 🇩🇪</p>

      <div className="glass rounded-3xl w-full p-8 mb-6">
        <p className="text-sm opacity-70 mb-1">{result.name} scored</p>
        <div className="text-6xl font-extrabold german-gradient-text my-2">{result.overall}%</div>
        <p className="text-sm opacity-80">{grade}</p>
        <p className="text-xs opacity-50 mt-2">{result.label}</p>
      </div>

      <div className="grid gap-2 w-full mb-6">
        {result.perPart.map((p) => (
          <div key={p.title} className="glass rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-left">{p.title}</span>
            <span className={`text-sm font-extrabold ${p.pct >= 70 ? "text-emerald-300" : p.pct >= 50 ? "text-amber-300" : "text-red-300"}`}>
              {p.pct}%
            </span>
          </div>
        ))}
      </div>

      {result.rubric && (
        <div className="glass rounded-2xl w-full p-5 mb-6 text-left">
          <div className="text-xs font-bold tracking-widest opacity-60 mb-3">SPRECHEN — AI RUBRIC</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>🗣️ Fluency: {result.rubric.fluency}/5</div>
            <div>📚 Vocab: {result.rubric.vocab}/5</div>
            <div>✅ Accuracy: {result.rubric.accuracy}/5</div>
            <div>👄 Pronunciation: {result.rubric.pronunciation}/5</div>
          </div>
        </div>
      )}

      <div className="glass rounded-3xl w-full p-6 border border-amber-400/40">
        <div className="font-extrabold text-lg mb-1">Think you can beat {result.overall}%? 🎯</div>
        <p className="text-sm opacity-70 mb-4">
          Free German speaking practice with AI avatars, 50 Goethe-style mocks per level, vocab, grammar & stories.
        </p>
        <Link href="/" className="btn-primary w-full !py-4 block">
          🚀 Start free — no card needed
        </Link>
      </div>

      <Link href="/practice" className="text-xs opacity-50 hover:opacity-80 mt-6">What is SprachDost?</Link>
    </main>
  );
}
