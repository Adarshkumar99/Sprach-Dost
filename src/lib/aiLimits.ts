import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Shared free-daily-limit logic for AI conversation routes.
 * anonymous: 12 replies/day • logged-in free: 40/day • Pro: unlimited.
 * In-memory — resets on deploy/restart.
 */

const FREE_LIMIT_ANON = 12;
const FREE_LIMIT_USER = 40;
const usage = new Map<string, { day: string; count: number }>();

export async function resolveCaller(req: Request): Promise<{ key: string; pro: boolean }> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return { key: `ip:${ip}`, pro: false };
  try {
    const sb = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data } = await sb.auth.getUser(token);
    if (!data?.user) return { key: `ip:${ip}`, pro: false };
    const { data: prof } = await sb
      .from("profiles")
      .select("is_pro")
      .eq("id", data.user.id)
      .maybeSingle();
    return { key: `uid:${data.user.id}`, pro: !!prof?.is_pro };
  } catch {
    return { key: `ip:${ip}`, pro: false };
  }
}

export function overLimit(key: string, limit: number): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const entry = usage.get(key);
  if (!entry || entry.day !== day) {
    usage.set(key, { day, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

export async function enforceAiLimit(
  req: Request
): Promise<NextResponse | null> {
  const { key, pro } = await resolveCaller(req);
  if (pro) return null;
  const limit = key.startsWith("uid:") ? FREE_LIMIT_USER : FREE_LIMIT_ANON;
  if (overLimit(key, limit)) {
    return NextResponse.json(
      { limit: true, error: "Daily free limit reached. Upgrade to Pro for unlimited practice." },
      { status: 429 }
    );
  }
  return null;
}
