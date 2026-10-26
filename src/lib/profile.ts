/**
 * Local profile helpers — avatar color + initials for the account avatar.
 * Color is stored in localStorage (per device), derived from the user id
 * until the user picks one in Edit Profile.
 */

const KEY = "sprachdost_profile_color";

export const AVATAR_COLORS = [
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function getProfileColor(userId?: string): string {
  if (typeof window === "undefined") return AVATAR_COLORS[0];
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && (AVATAR_COLORS as string[]).includes(saved)) return saved;
  } catch {
    /* noop */
  }
  if (userId) return AVATAR_COLORS[hashId(userId) % AVATAR_COLORS.length];
  return AVATAR_COLORS[0];
}

export function setProfileColor(color: string) {
  try {
    localStorage.setItem(KEY, color);
  } catch {
    /* noop */
  }
}

/** 1–2 letter initials for the avatar circle */
export function initialsOf(nameOrEmail: string): string {
  const clean = nameOrEmail.trim();
  if (!clean) return "?";
  if (clean.includes("@")) return clean.slice(0, 2).toUpperCase();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}
