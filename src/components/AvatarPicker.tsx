"use client";

import Avatar from "./Avatar";
import { AVATAR_LIST } from "@/lib/avatars";

export default function AvatarPicker({
  value,
  onChange,
  filter,
}: {
  value: string;
  onChange: (key: string) => void;
  /** optional: only show these preset keys */
  filter?: string[];
}) {
  const list = filter ? AVATAR_LIST.filter((a) => filter.includes(a.key)) : AVATAR_LIST;

  return (
    <div className="flex gap-3 flex-wrap justify-center">
      {list.map((a) => {
        const active = value === a.key;
        return (
          <button
            key={a.key}
            onClick={() => onChange(a.key)}
            className={`flex flex-col items-center gap-1 rounded-2xl p-2 transition-all ${
              active
                ? "bg-amber-400/15 ring-2 ring-amber-400 scale-105"
                : "opacity-60 hover:opacity-100 hover:scale-105"
            }`}
            title={`${a.name} — ${a.role}`}
          >
            <Avatar variant={a.key} size={64} name="" statusText="" />
            <div className="text-[11px] font-bold -mt-2">{a.emoji} {a.name}</div>
          </button>
        );
      })}
    </div>
  );
}
