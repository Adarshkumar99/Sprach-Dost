"use client";

import { useEffect, useRef, useState } from "react";
import { resolvePreset } from "@/lib/avatars";

/**
 * 2D animated avatar with lip-sync (mouth animates while `speaking` is true).
 * Pure SVG + CSS — zero cost, zero external assets, works offline.
 * Config-driven via lib/avatars.ts presets.
 */
export default function Avatar({
  variant = "anna",
  speaking = false,
  size = 220,
  name,
  statusText,
}: {
  variant?: string; // preset key: anna | markus | lena | raj | sophie | jonas (legacy: "lehrer")
  speaking?: boolean;
  size?: number;
  name?: string;
  statusText?: string;
}) {
  const [mouthOpen, setMouthOpen] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (speaking) {
      intervalRef.current = setInterval(() => {
        setMouthOpen(Math.random() * 0.85 + 0.15);
      }, 110);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setMouthOpen(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [speaking]);

  const preset = resolvePreset(variant);
  const { skin, hair, hairStyle, glasses, shirt } = preset.style;

  const o = mouthOpen;
  const mouthPath = `M 85 128 Q 100 ${128 + o * 14} 115 128 Q 100 ${128 + o * 28} 85 128 Z`;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="floaty relative">
        {speaking && (
          <div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: "0 0 60px 10px rgba(251,191,36,0.35)" }}
          />
        )}
        <svg width={size} height={size} viewBox="0 0 200 200">
          {/* backdrop circle */}
          <defs>
            <radialGradient id={`bg-${preset.key}`} cx="50%" cy="35%" r="75%">
              <stop offset="0%" stopColor={shirt} stopOpacity="0.25" />
              <stop offset="100%" stopColor={shirt} stopOpacity="0.05" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="105" r="95" fill={`url(#bg-${preset.key})`} />

          {/* neck + shirt with collar */}
          <rect x="88" y="150" width="24" height="20" rx="6" fill={skin} />
          <path d="M 55 200 Q 60 168 100 166 Q 140 168 145 200 Z" fill={shirt} />
          <path d="M 88 168 L 100 178 L 112 168" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          {/* ears */}
          <ellipse cx="48" cy="108" rx="7" ry="11" fill={skin} />
          <ellipse cx="152" cy="108" rx="7" ry="11" fill={skin} />

          {/* head */}
          <ellipse cx="100" cy="105" rx="52" ry="56" fill={skin} />
          {/* face soft shadow bottom */}
          <ellipse cx="100" cy="140" rx="34" ry="14" fill="#00000008" />

          {/* hair by style */}
          {hairStyle === "short" && (
            <path d="M 48 100 Q 44 55 100 52 Q 156 55 152 100 Q 150 70 100 68 Q 50 70 48 100 Z" fill={hair} />
          )}
          {hairStyle === "long" && (
            <>
              <path d="M 48 100 Q 42 50 100 46 Q 158 50 152 100 Q 152 64 100 62 Q 48 64 48 100 Z" fill={hair} />
              <path d="M 49 92 Q 40 130 50 158 Q 58 130 54 100 Z" fill={hair} />
              <path d="M 151 92 Q 160 130 150 158 Q 142 130 146 100 Z" fill={hair} />
            </>
          )}
          {hairStyle === "bob" && (
            <>
              <path d="M 46 105 Q 40 48 100 46 Q 160 48 154 105 Q 154 66 100 64 Q 46 66 46 105 Z" fill={hair} />
              <path d="M 47 96 Q 42 118 48 132 Q 56 118 53 100 Z" fill={hair} />
              <path d="M 153 96 Q 158 118 152 132 Q 144 118 147 100 Z" fill={hair} />
            </>
          )}
          {hairStyle === "curly" && (
            <g fill={hair}>
              <circle cx="100" cy="58" r="16" />
              <circle cx="78" cy="66" r="15" />
              <circle cx="122" cy="66" r="15" />
              <circle cx="60" cy="80" r="13" />
              <circle cx="140" cy="80" r="13" />
              <path d="M 50 96 Q 48 66 100 60 Q 152 66 150 96 Q 146 74 100 72 Q 54 74 50 96 Z" />
            </g>
          )}

          {/* eyebrows */}
          <rect x="72" y="88" width="16" height="3.4" rx="1.7" fill={hair} />
          <rect x="112" y="88" width="16" height="3.4" rx="1.7" fill={hair} />

          {/* eyes (blinking) */}
          <g className="eye-blink">
            <circle cx="80" cy="100" r="5" fill="#1f2430" />
            <circle cx="120" cy="100" r="5" fill="#1f2430" />
            <circle cx="81.7" cy="98.3" r="1.6" fill="#fff" />
            <circle cx="121.7" cy="98.3" r="1.6" fill="#fff" />
          </g>

          {/* glasses */}
          {glasses && (
            <g stroke="#39445c" strokeWidth="2.4" fill="none">
              <circle cx="80" cy="100" r="11" />
              <circle cx="120" cy="100" r="11" />
              <line x1="91" y1="100" x2="109" y2="100" />
              <line x1="69" y1="99" x2="55" y2="94" />
              <line x1="131" y1="99" x2="145" y2="94" />
            </g>
          )}

          {/* nose */}
          <path d="M 100 104 Q 97 114 100 116 Q 103 116 102 113" stroke="#d69b6a" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* mouth (lip-sync) */}
          <path d={mouthPath} fill={speaking ? "#7a2d3b" : "#9c4a55"} stroke="#8c3f4c" strokeWidth="2" strokeLinejoin="round" />
          {speaking && o > 0.45 && (
            <ellipse cx="100" cy={130 + o * 9} rx={7 * o} ry={3.5 * o} fill="#e6707e" opacity="0.9" />
          )}
          {/* soft smile line when idle */}
          {!speaking && (
            <path d="M 88 126 Q 100 132 112 126" stroke="#b57a83" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
          )}

          {/* cheeks */}
          <circle cx="70" cy="118" r="7" fill="#f5b08e" opacity="0.55" />
          <circle cx="130" cy="118" r="7" fill="#f5b08e" opacity="0.55" />
        </svg>
      </div>

      <div className="text-center">
        <div className="font-bold text-lg tracking-wide">{name ?? preset.name}</div>
        <div className="text-xs opacity-70">
          {statusText ?? (speaking ? "speaking…" : preset.role)}
        </div>
      </div>
    </div>
  );
}
