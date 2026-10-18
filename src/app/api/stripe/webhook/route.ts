import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Stripe webhook → keeps profiles.is_pro in sync.
 * Required env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 *               NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Stripe CLI test: stripe listen --forward-to localhost:3000/api/stripe/webhook
 * Events: checkout.session.completed, customer.subscription.deleted,
 *         customer.subscription.updated, customer.subscription.paused
 */

let admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  if (!admin) admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  return admin;
}

async function setPro(uid: string, isPro: boolean, customerId?: string) {
  const sb = getAdmin();
  if (!sb) {
    console.error("webhook: missing SUPABASE_SERVICE_ROLE_KEY — cannot update profile");
    return;
  }
  const patch: Record<string, unknown> = { is_pro: isPro };
  if (customerId) patch.stripe_customer_id = customerId;
  const { error } = await sb.from("profiles").update(patch).eq("id", uid);
  if (error) console.error("webhook: profile update failed:", error.message);
}

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) {
    return NextResponse.json({ error: "Stripe webhook not configured." }, { status: 501 });
  }

  const stripe = new Stripe(key);
  const signature = req.headers.get("stripe-signature") ?? "";
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "invalid signature";
    return NextResponse.json({ error: `Webhook signature verification failed: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.metadata?.supabase_uid;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (uid) await setPro(uid, true, customerId);
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.paused": {
        const sub = event.data.object as Stripe.Subscription;
        const uid = sub.metadata?.supabase_uid;
        if (uid) await setPro(uid, false);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const uid = sub.metadata?.supabase_uid;
        const active = sub.status === "active" || sub.status === "trialing";
        if (uid) await setPro(uid, active);
        break;
      }
      default:
        break;
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "handler error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
