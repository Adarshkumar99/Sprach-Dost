"use client";

/**
 * Edit Profile modal — display name (saved to Supabase profiles + auth
 * metadata, reflected in the leaderboard immediately) and avatar circle
 * color (saved locally per device).
 */

import { useEffect, useRef, useState } from "react";
import { updateProfile } from "@/lib/supabase";
import { setProfileColor, AVATAR_COLORS, initialsOf } from "@/lib/profile";
import { weekKey } from "@/lib/weekly";
import { getSupabase } from "@/lib/supabase";

export default function EditProfileModal({
  userId,
  email,
  initialName,
  initialColor,
  onClose,
  onSaved,
}: {
  userId: string;
  email: string;
  initialName: string;
  initialColor: string;
  onClose: () => void;
  onSaved: (name: string, color: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    setSaved(false);

    setProfileColor(color);

    const clean = name.trim();
    if (clean && clean !== initialName) {
      const res = await updateProfile(clean);
      if (res.error) {
        setError(res.error);
        setSaving(false);
        return;
      }
      // reflect the new name in this week's leaderboard row right away
      const sb = getSupabase();
      if (sb) {
        await sb
          .from("weekly_scores")
          .update({ display_name: clean })
          .eq("user_id", userId)
          .eq("week_key", weekKey());
      }
    }
    onSaved(clean || initialName, color);
    setSaved(true);
    setSaving(false);
    setTimeout(onClose, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="glass rounded-3xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg">✏️ Edit Profile</h2>
          <button onClick={onClose} className="text-sm opacity-60 hover:opacity-100 px-2">✕</button>
        </div>

        {/* live avatar preview */}
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center font-extrabold text-lg text-white shrink-0"
            style={{ background: color }}
          >
            {initialsOf(name || email)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{name || "Learner"}</div>
            <div className="text-xs opacity-60 truncate">{email}</div>
          </div>
        </div>

        <label className="text-xs font-bold tracking-widest opacity-60 block mb-1.5">DISPLAY NAME</label>
        <input
          ref={inputRef}
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Your name"
          className="w-full rounded-xl px-4 py-2.5 bg-white/8 border border-white/15 outline-none focus:border-amber-400 text-sm mb-5"
        />

        <label className="text-xs font-bold tracking-widest opacity-60 block mb-2">AVATAR COLOR</label>
        <div className="flex gap-2.5 mb-6 flex-wrap">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`color ${c}`}
              className={`w-8 h-8 rounded-full transition-transform ${
                color === c ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0b1020]" : "hover:scale-105"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>

        {error && <p className="text-xs text-red-300 mb-3">⚠️ {error}</p>}
        {saved && <p className="text-xs text-emerald-300 mb-3">✓ Profile saved</p>}

        <button onClick={save} disabled={saving} className="btn-primary w-full text-sm disabled:opacity-60">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
