/** Avatar presets — config-driven, so we can add characters anytime */

export type AvatarStyle = {
  skin: string;
  hair: string;
  hairStyle: "long" | "short" | "bob" | "curly";
  glasses: boolean;
  shirt: string;
  genderHint: "anna" | "lehrer"; // drives voice pitch
};

export type AvatarPreset = {
  key: string;
  name: string;
  role: string;
  emoji: string;
  style: AvatarStyle;
};

export const AVATARS: Record<string, AvatarPreset> = {
  anna: {
    key: "anna",
    name: "Anna",
    role: "Friendly conversation partner",
    emoji: "👩",
    style: { skin: "#f7d4b2", hair: "#5b3a1e", hairStyle: "long", glasses: false, shirt: "#e11d48", genderHint: "anna" },
  },
  markus: {
    key: "markus",
    name: "Markus",
    role: "Casual Berlin buddy",
    emoji: "👨",
    style: { skin: "#f0c8a0", hair: "#2d2d3a", hairStyle: "short", glasses: false, shirt: "#0d9488", genderHint: "lehrer" },
  },
  lena: {
    key: "lena",
    name: "Lena",
    role: "Patient practice friend",
    emoji: "👱‍♀️",
    style: { skin: "#f7d4b2", hair: "#d9a94a", hairStyle: "bob", glasses: false, shirt: "#8b5cf6", genderHint: "anna" },
  },
  raj: {
    key: "raj",
    name: "Raj",
    role: "Indian fella learning with you",
    emoji: "🇮🇳",
    style: { skin: "#d9a066", hair: "#1c1917", hairStyle: "curly", glasses: false, shirt: "#16a34a", genderHint: "lehrer" },
  },
  sophie: {
    key: "sophie",
    name: "Sophie",
    role: "Structured teacher",
    emoji: "👩‍🏫",
    style: { skin: "#f0c8a0", hair: "#4a2c14", hairStyle: "bob", glasses: true, shirt: "#2563eb", genderHint: "anna" },
  },
  jonas: {
    key: "jonas",
    name: "Jonas",
    role: "Grammar expert teacher",
    emoji: "👨‍🏫",
    style: { skin: "#f0c8a0", hair: "#2d2d3a", hairStyle: "short", glasses: true, shirt: "#2563eb", genderHint: "lehrer" },
  },
};

export const AVATAR_LIST: AvatarPreset[] = Object.values(AVATARS);

/** legacy mapping */
export function resolvePreset(variantOrKey: string): AvatarPreset {
  if (AVATARS[variantOrKey]) return AVATARS[variantOrKey];
  if (variantOrKey === "lehrer") return AVATARS.jonas;
  return AVATARS.anna;
}

const STORE_KEY = "sprachdost_avatar";

export function getStoredAvatar(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(STORE_KEY) ?? fallback;
}

export function storeAvatar(key: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, key);
}
