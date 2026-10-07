"use client";

/**
 * Supabase auth + progress sync.
 * Works fully when NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 * are configured (see supabase/schema.sql for the DB table). Without those
 * env vars everything silently no-ops and the app stays 100% local — guests
 * still get localStorage persistence on their device.
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}

export function authEnabled(): boolean {
  return getSupabase() !== null;
}

export async function getUser(): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

export function onAuthChange(cb: (user: User | null) => void) {
  const sb = getSupabase();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_e, session) => cb(session?.user ?? null));
  return () => data.subscription.unsubscribe();
}

export async function signUpWithEmail(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) return { error: "Auth is not configured yet." };
  const { error } = await sb.auth.signUp({ email, password });
  return { error: error?.message ?? null };
}

export async function signInWithEmail(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) return { error: "Auth is not configured yet." };
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signInWithGoogle() {
  const sb = getSupabase();
  if (!sb) return { error: "Auth is not configured yet." };
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/practice" },
  });
  return { error: error?.message ?? null };
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

/* ── cloud progress sync (single JSON blob per user) ──
   Local keys synced: sprachdost_srs, sprachdost_deck_order,
   sprachdost_grammar_scores, sprachdost_progress          */

const SYNC_KEYS = [
  "sprachdost_srs",
  "sprachdost_deck_order",
  "sprachdost_grammar_scores",
  "sprachdost_progress",
];

let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Upload local stores to the cloud (debounced, fire & forget). */
export function pushProgressToCloud() {
  const sb = getSupabase();
  if (!sb) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    const user = await getUser();
    if (!user) return;
    const data: Record<string, unknown> = {};
    for (const k of SYNC_KEYS) {
      try { data[k] = JSON.parse(localStorage.getItem(k) ?? "null"); } catch { data[k] = null; }
    }
    await sb.from("user_data").upsert(
      { user_id: user.id, data, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  }, 1500);
}

/** On login: pull cloud stores + per-key merge (cloud wins if local empty/newer per entry). */
export async function pullProgressFromCloud(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const user = await getUser();
  if (!user) return false;
  const { data } = await sb.from("user_data").select("data").eq("user_id", user.id).maybeSingle();
  if (!data?.data) return false;

  const cloud = data.data as Record<string, Record<string, unknown>>;
  let changed = false;
  for (const k of SYNC_KEYS) {
    const cloudVal = cloud?.[k];
    if (cloudVal == null) continue;
    let localVal: Record<string, unknown> = {};
    try { localVal = JSON.parse(localStorage.getItem(k) ?? "{}"); } catch { localVal = {}; }
    // shallow per-key merge: whichever side has an entry keeps it; on tie prefer higher counts
    const merged: Record<string, unknown> = { ...cloudVal };
    for (const [id, localEntry] of Object.entries(localVal)) {
      const ce = merged[id] as Record<string, number> | undefined;
      const le = localEntry as Record<string, number>;
      if (!ce) { merged[id] = le; continue; }
      // SRS cards: keep the entry with more reps (more progress); scores: keep higher score
      const lScore = Number(le?.reps ?? le?.correct ?? 0);
      const cScore = Number(ce?.reps ?? ce?.correct ?? 0);
      if (lScore > cScore) merged[id] = le;
    }
    localStorage.setItem(k, JSON.stringify(merged));
    changed = true;
  }
  return changed;
}
