import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Creates a Stripe Checkout Session (₹500/mo subscription).
 * Requires: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, NEXT_PUBLIC_SITE_URL
 */
export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key || !priceId) {
    return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 501 });
  }
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 500 });
  }

  // authenticate the caller via Supabase token
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  const sb = createClient(supabaseUrl, supabaseAnon);
  const { data: userData, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid session — please log in again." }, { status: 401 });
  }
  const user = userData.user;
  const email = user.email ?? undefined;

  try {
    const stripe = new Stripe(key);
    let customerId = user.user_metadata?.stripe_customer_id as string | undefined;

    // reuse (or lazily create) the Stripe customer
    if (!customerId && email) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      customerId = existing.data[0]?.id;
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_uid: user.id },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/pro?success=1`,
      cancel_url: `${siteUrl}/pro?canceled=1`,
      subscription_data: { metadata: { supabase_uid: user.id } },
      metadata: { supabase_uid: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
