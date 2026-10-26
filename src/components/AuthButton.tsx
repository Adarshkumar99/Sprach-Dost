"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authEnabled, getUser, onAuthChange, pullProgressFromCloud, signOut, ensureProfile } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { getProfileColor, initialsOf } from "@/lib/profile";
import EditProfileModal from "@/components/EditProfileModal";

/**
 * Login state chip. Renders nothing when auth isn't configured,
 * "🔐 Login" for guests, and a circular avatar with a dropdown
 * (email, edit profile, sign out) when logged in.
 * On every fresh login it pulls cloud progress into local storage.
 */
export default function AuthButton({ className = "" }: { className?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [color, setColor] = useState("#f59e0b");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const pulledFor = useRef<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

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
        if (!usr) { setOpen(false); setEditing(false); setDisplayName(""); }
        if (usr && pulledFor.current !== usr.id) {
          pulledFor.current = usr.id;
          void pullProgressFromCloud();
        }
      });
    })();
    return () => unsubscribe?.();
  }, []);

  /* load profile bits (name from profiles, color local) whenever a user appears */
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void (async () => {
      const n = await ensureProfile().catch(() => null);
      if (!alive) return;
      setColor(getProfileColor(user.id));
      if (n) setDisplayName(n);
    })();
    return () => { alive = false; };
  }, [user]);

  /* close dropdown on outside click / Escape */
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ready || !authEnabled()) return null;

  if (!user) {
    return (
      <Link href="/login" className={`btn-ghost !py-2 !px-4 text-sm ${className}`}>
        🔐 Login
      </Link>
    );
  }

  const name = displayName || user.email?.split("@")[0] || "Learner";

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm text-white hover:scale-105 transition-transform shrink-0"
        style={{ background: color }}
      >
        {initialsOf(name)}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 glass rounded-2xl p-2 z-50 shadow-xl">
          <div className="flex items-center gap-3 px-3 py-2.5 border-b border-white/10 mb-1">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm text-white shrink-0"
              style={{ background: color }}
            >
              {initialsOf(name)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{name}</div>
              <div className="text-xs opacity-60 truncate" title={user.email ?? ""}>
                {user.email}
              </div>
            </div>
          </div>

          <button
            onClick={() => { setOpen(false); setEditing(true); }}
            className="w-full text-left text-sm rounded-xl px-3 py-2.5 hover:bg-white/10 flex items-center gap-2.5"
          >
            ✏️ Edit Profile
          </button>
          <button
            onClick={() => { setOpen(false); void signOut(); }}
            className="w-full text-left text-sm rounded-xl px-3 py-2.5 hover:bg-white/10 flex items-center gap-2.5 text-red-300"
          >
            🚪 Sign out
          </button>
        </div>
      )}

      {editing && (
        <EditProfileModal
          userId={user.id}
          email={user.email ?? ""}
          initialName={name}
          initialColor={color}
          onClose={() => setEditing(false)}
          onSaved={(n, c) => { setDisplayName(n); setColor(c); }}
        />
      )}
    </div>
  );
}
