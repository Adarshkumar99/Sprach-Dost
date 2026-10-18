import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { wordOfTheDay } from "@/lib/wotd";

export const runtime = "nodejs";

/**
 * Daily Word-of-the-Day push — called by the Vercel cron (vercel.json),
 * 00:30 UTC = 06:00 IST. Protected with CRON_SECRET (Vercel sends it as
 * `Authorization: Bearer <CRON_SECRET>`).
 *
 * Required env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET,
 *               NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
let admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!admin) admin = createClient(url, key, { auth: { persistSession: false } });
  return admin;
}

export async function GET(req: Request) {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sb = getAdmin();
  if (!pub || !priv || !sb) {
    return NextResponse.json({ error: "Push not configured." }, { status: 501 });
  }

  const auth = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (process.env.CRON_SECRET && auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const wotd = await wordOfTheDay();
  if (!wotd) return NextResponse.json({ error: "No vocab bank." }, { status: 500 });

  const payload = JSON.stringify({
    title: `🌟 ${wotd.de}`,
    body: `${wotd.en}${wotd.ex ? ` — ${wotd.ex}` : ""}`,
    url: "/practice",
    tag: `wotd-${wotd.date}`,
  });

  webpush.setVapidDetails(
    process.env.VAPID_CONTACT ?? "mailto:hello@sprachdost.app",
    pub,
    priv
  );

  // send to every subscription; drop expired ones (410)
  let sent = 0;
  let failed = 0;
  let from = 0;
  const PAGE = 200;
  for (;;) {
    const { data: subs, error } = await sb
      .from("push_subscriptions")
      .select("endpoint, keys")
      .range(from, from + PAGE - 1);
    if (error || !subs?.length) break;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
          payload
        );
        sent++;
      } catch (e: unknown) {
        failed++;
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }
    from += PAGE;
    if (subs.length < PAGE) break;
  }

  return NextResponse.json({ ok: true, word: wotd.de, sent, failed });
}
