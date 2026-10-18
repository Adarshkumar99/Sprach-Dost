import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/** store a push subscription (auth optional — endpoint is the unique key) */
let admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!admin) admin = createClient(url, key, { auth: { persistSession: false } });
  return admin;
}

export async function POST(req: Request) {
  const sb = getAdmin();
  if (!sb) {
    return NextResponse.json({ error: "Push storage not configured (needs Supabase)." }, { status: 501 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.subscription?.endpoint || !body?.subscription?.keys?.p256dh || !body?.subscription?.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription payload." }, { status: 400 });
  }

  // attach the user id if a valid token was sent
  let userId: string | null = null;
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (token && url && anon) {
    try {
      const sbUser = createClient(url, anon, { auth: { persistSession: false } });
      const { data } = await sbUser.auth.getUser(token);
      if (data?.user) userId = data.user.id;
    } catch {
      /* anonymous subscription is fine */
    }
  }

  const { error } = await sb.from("push_subscriptions").upsert(
    {
      endpoint: body.subscription.endpoint,
      user_id: userId,
      keys: body.subscription.keys,
      user_agent: req.headers.get("user-agent") ?? "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const sb = getAdmin();
  if (!sb) return NextResponse.json({ ok: true });
  const body = await req.json().catch(() => null);
  if (!body?.subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  await sb.from("push_subscriptions").delete().eq("endpoint", body.subscription.endpoint);
  return NextResponse.json({ ok: true });
}
