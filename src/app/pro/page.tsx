"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePro } from "@/lib/usePro";
import { getAccessToken, authEnabled, getUser } from "@/lib/supabase";

const PERKS = [
  { icon: "♾️", title: "Unlimited conversations", desc: "Anna & Lehrer without daily limits" },
  { icon: "🎓", title: "AI exam grading", desc: "Schreiben + Sprechen rubric scores with CEFR estimate" },
  { icon: "🧑‍⚕️", title: "Career packs", desc: "Nursing, IT & Ausbildung role-plays with branching stories" },
  { icon: "🛡️", title: "Cloud sync everywhere", desc: "Progress, SRS and exam history on every device" },
];

export default function ProPage() {
  const { isPro, loading } = usePro();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      getUser().then((u) => setSignedIn(!!u));
      const params = new URLSearchParams(window.location.search);
      if (params.get("success")) setBanner("🎉 Payment successful — Pro is active. Viel Glück beim Lernen!");
      if (params.get("canceled")) setBanner("Checkout canceled — no worries, you can come back anytime.");
    });
  }, []);

  const startCheckout = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Please log in first, then upgrade.");
        return;
      }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Could not start checkout.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const openPortal = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error ?? "Could not open billing portal.");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-14 max-w-2xl mx-auto w-full text-center">
      <Link href="/" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100">← Home</Link>
      <div className="text-6xl mb-4">✨</div>
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">SprachDost Pro</h1>
      <p className="opacity-70 text-sm mb-8">Speak German with confidence — without limits.</p>

      {banner && (
        <div className="glass rounded-2xl px-5 py-3 text-sm mb-6 border border-emerald-400/40 text-emerald-300">
          {banner}
        </div>
      )}

      <div className="grid gap-3 w-full mb-8 text-left">
        {PERKS.map((p) => (
          <div key={p.title} className="glass rounded-2xl p-4 flex items-center gap-4">
            <div className="text-3xl">{p.icon}</div>
            <div>
              <div className="font-bold">{p.title}</div>
              <div className="text-xs opacity-60">{p.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-3xl p-8 w-full">
        <div className="flex items-baseline justify-center gap-2 mb-1">
          <span className="text-4xl font-extrabold german-gradient-text">₹500</span>
          <span className="opacity-60 text-sm">/ month</span>
        </div>
        <p className="text-xs opacity-60 mb-6">Cancel anytime via the billing portal.</p>

        {loading ? (
          <p className="text-sm opacity-60">Checking your plan…</p>
        ) : isPro ? (
          <>
            <div className="text-emerald-300 font-bold mb-4">✅ You are a Pro member — danke schön!</div>
            <button onClick={openPortal} disabled={busy} className="btn-primary w-full !py-4 disabled:opacity-50">
              {busy ? "Opening…" : "💳 Manage billing (cancel / invoices)"}
            </button>
          </>
        ) : signedIn === false ? (
          <>
            <p className="text-sm opacity-80 mb-4">Log in first, then upgrade — your Pro follows you to every device.</p>
            <Link href="/login" className="btn-primary inline-block w-full !py-4">
              Log in →
            </Link>
          </>
        ) : (
          <>
            <button onClick={startCheckout} disabled={busy} className="btn-primary w-full !py-4 disabled:opacity-50">
              {busy ? "Starting checkout…" : "✨ Upgrade to Pro →"}
            </button>
            {!authEnabled() && (
              <p className="text-xs opacity-60 mt-3">
                (Billing needs Supabase auth + Stripe keys configured — see README.)
              </p>
            )}
          </>
        )}

        {error && <p className="text-xs text-red-300 mt-4">{error}</p>}
      </div>

      <Link href="/practice" className="btn-ghost text-sm mt-8">
        ← Back to practice hub
      </Link>
    </main>
  );
}
