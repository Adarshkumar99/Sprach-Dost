"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authEnabled, signInWithEmail, signInWithGoogle, signUpWithEmail, getUser } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getUser().then((u) => { if (u) router.replace("/practice"); });
  }, [router]);

  if (!authEnabled()) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h1 className="text-2xl font-extrabold mb-2">Login is being set up</h1>
        <p className="opacity-70 max-w-md mb-6 text-sm">
          Cloud accounts aren&apos;t wired yet — but everything works locally right now.
          Your progress is saved on this device automatically.
        </p>
        <Link href="/practice" className="btn-primary text-sm">← Continue without login</Link>
      </main>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setMsg(null);
    const { error } = mode === "login"
      ? await signInWithEmail(email.trim(), password)
      : await signUpWithEmail(email.trim(), password);
    setBusy(false);
    if (error) setError(error);
    else if (mode === "signup") setMsg("Check your email to confirm the account, then log in. ✉️");
    else router.replace("/practice");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-sm mx-auto w-full">
      <Link href="/practice" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100">← Back</Link>

      <h1 className="text-3xl font-extrabold mb-2">🔐 {mode === "login" ? "Welcome back" : "Create account"}</h1>
      <p className="opacity-70 text-sm mb-8 text-center">
        Sync your vocabulary, grammar scores and streak across devices.
      </p>

      <form onSubmit={submit} className="glass rounded-2xl p-6 w-full flex flex-col gap-3">
        <input
          type="email" required placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-amber-400/60"
        />
        <input
          type="password" required minLength={6} placeholder="Password (min 6 characters)"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-amber-400/60"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        {msg && <p className="text-emerald-400 text-xs">{msg}</p>}
        <button disabled={busy} className="btn-primary !py-3 mt-1 disabled:opacity-50">
          {busy ? "…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
        <button
          type="button"
          onClick={() => signInWithGoogle().then((r) => r.error && setError(r.error))}
          className="btn-ghost !py-3 text-sm"
        >
          Continue with Google
        </button>
      </form>

      <button
        onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
        className="mt-5 text-sm opacity-70 hover:opacity-100 underline underline-offset-2"
      >
        {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
      </button>
    </main>
  );
}
