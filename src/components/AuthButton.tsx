"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authEnabled, getUser, onAuthChange, pullProgressFromCloud, signOut } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

/**
 * Login state chip. Renders nothing when auth isn't configured,
 * "🔐 Login" for guests, and the user email + sign-out when logged in.
 * On every fresh login it pulls cloud progress into local storage.
 */
export default function AuthButton({ className = "" }: { className?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const pulledFor = useRef<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      if (!authEnabled()) { setReady(true); return; }
      const u = await getUser();
      setUser(u);
      if (u && pulledFor.current !== u.id) {
        pulledFor.current = u.id;
        await pullProgressFromCloud(); // merge cloud → local
      }
      setReady(true);
      unsubscribe = onAuthChange((usr) => {
        setUser(usr);
        if (usr && pulledFor.current !== usr.id) {
          pulledFor.current = usr.id;
          void pullProgressFromCloud();
        }
      });
    })();
    return () => unsubscribe?.();
  }, []);

  if (!ready || !authEnabled()) return null;

  if (!user) {
    return (
      <Link href="/login" className={`btn-ghost !py-2 !px-4 text-sm ${className}`}>
        🔐 Login
      </Link>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs opacity-70 hidden sm:inline" title="Progress syncs to your account">
        ☁️ {user.email}
      </span>
      <button onClick={() => signOut()} className="glass rounded-full px-3 py-1.5 text-xs hover:bg-white/10">
        Sign out
      </button>
    </div>
  );
}
