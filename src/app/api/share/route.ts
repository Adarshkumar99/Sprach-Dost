import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/** public shareable score cards (/r/<id>) — write via service role, read via public page */
let admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!admin) admin = createClient(url, key, { auth: { persistSession: false } });
  return admin;
}

type SharePayload = {
  overall?: number;
  level?: string;
  label?: string;
  perPart?: { title: string; pct: number }[];
  rubric?: { fluency: number; vocab: number; accuracy: number; pronunciation: number; cefr: string };
  name?: string;
};

function clampPct(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export async function POST(req: Request) {
  const sb = getAdmin();
  if (!sb) {
    return NextResponse.json({ error: "Sharing is not configured yet." }, { status: 501 });
  }

  const body = (await req.json().catch(() => null)) as SharePayload | null;
  if (!body || typeof body.overall !== "number" || !Array.isArray(body.perPart) || body.perPart.length === 0) {
    return NextResponse.json({ error: "Invalid result payload." }, { status: 400 });
  }

  const data = {
    overall: clampPct(body.overall),
    level: String(body.level ?? "A1").slice(0, 4),
    label: String(body.label ?? "Goethe mock").slice(0, 60),
    perPart: body.perPart.slice(0, 8).map((p) => ({
      title: String(p.title ?? "").slice(0, 60),
      pct: clampPct(p.pct),
    })),
    rubric: body.rubric
      ? {
          fluency: clampPct(body.rubric.fluency),
          vocab: clampPct(body.rubric.vocab),
          accuracy: clampPct(body.rubric.accuracy),
          pronunciation: clampPct(body.rubric.pronunciation),
          cefr: String(body.rubric.cefr ?? "").slice(0, 4),
        }
      : undefined,
    name: String(body.name ?? "German Learner").slice(0, 30),
  };

  // short, URL-safe, collision-checked id
  for (let i = 0; i < 5; i++) {
    const id = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31])
      .join("");
    const { error } = await sb.from("shared_results").insert({ id, data });
    if (!error) return NextResponse.json({ id, url: `/r/${id}` });
    if (!String(error.message).includes("duplicate")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Could not create share link." }, { status: 500 });
}
