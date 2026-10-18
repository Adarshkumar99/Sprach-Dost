import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Stripe billing portal — lets Pro users manage/cancel their subscription.
 */
export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 501 });
  }
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  const sb = createClient(supabaseUrl, supabaseAnon);
  const { data: userData, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  try {
    const stripe = new Stripe(key);
    const email = userData.user.email ?? "";
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customerId = existing.data[0]?.id;
    if (!customerId) {
      return NextResponse.json({ error: "No billing profile found — subscribe first." }, { status: 404 });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/pro`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
