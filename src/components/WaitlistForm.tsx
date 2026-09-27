"use client";

import { useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(clean)) return;
    try {
      const raw = localStorage.getItem("sprachdost_waitlist");
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(clean)) list.push(clean);
      localStorage.setItem("sprachdost_waitlist", JSON.stringify(list));
      setDone(true);
    } catch {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <div className="text-3xl mb-2">🎉</div>
        <p className="font-semibold">Thanks! You&apos;re on the waitlist.</p>
        <p className="text-sm opacity-70 mt-1">
          You&apos;ll be the first to know when Pro launches.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 rounded-full px-5 py-3 bg-white/10 border border-white/15 placeholder-white/40 outline-none focus:border-amber-400"
      />
      <button type="submit" className="btn-primary whitespace-nowrap">
        Join Waitlist 🚀
      </button>
    </form>
  );
}
