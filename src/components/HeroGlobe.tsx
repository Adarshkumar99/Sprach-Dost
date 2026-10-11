"use client";

import { useEffect, useRef, useState } from "react";

/**
 * HeroGlobe — Lingo-style rotating globe for the SprachDost hero.
 * Pure Canvas 2D (zero deps): ~700 particle dots + lat/long wireframe,
 * amber/gold on-brand palette, halo glow + ground shadow, mouse parallax.
 * Glass speech bubbles orbit it with rotating German words (slang + umlaut sets).
 */

/* words rotate through bubbles: slang first, umlaut mixed in */
const BUBBLE_WORDS: { w: string; c: string }[] = [
  { w: "Hallo!", c: "HELLO" },
  { w: "Ach so!", c: "I SEE" },
  { w: "Egal.", c: "WHATEVER" },
  { w: "Genau!", c: "EXACTLY" },
  { w: "schön", c: "BEAUTIFUL" },
  { w: "über", c: "ABOUT / OVER" },
  { w: "müsste", c: "WOULD HAVE TO" },
  { w: "Straße", c: "STREET" },
  { w: "Na klar", c: "OF COURSE" },
  { w: "Wunderbar", c: "WONDERFUL" },
  { w: "Doch!", c: "YES, ACTUALLY" },
  { w: "groß", c: "BIG" },
];

const BUBBLE_POS = [
  { left: "2%", top: "12%" },    // rim pe globe
  { right: "6%", top: "20%" },
  { left: "4%", bottom: "22%" },
  { right: "6%", bottom: "26%" }, // up on the rim — not floating away
] as const;

/* words glued onto the globe surface — they rotate/tilt with the globe */
const SURFACE_WORDS = ["schön", "Genau!", "über", "Servus", "müsste", "heiß", "Spaß", "Egal."];

function Bubble({ index, reduced }: { index: number; reduced: boolean }) {
  const [wi, setWi] = useState(index); // stagger start across the pool
  const [out, setOut] = useState(false);

  /* cycle this bubble through the word pool, staggered per bubble */
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => {
      setOut(true);
      setTimeout(() => {
        setWi((v) => (v + BUBBLE_POS.length) % BUBBLE_WORDS.length);
        setOut(false);
      }, 380);
    }, 5200 + index * 1400);
    return () => clearInterval(t);
  }, [index, reduced]);

  const word = BUBBLE_WORDS[wi];
  return (
    <div
      className={`absolute glass rounded-2xl px-4 py-2.5 shadow-xl bubble-float ${
        index >= 2 ? "hidden sm:block" : ""
      }`}
      style={{
        ...BUBBLE_POS[index],
        animationDelay: `${index * 0.6}s`,
        opacity: out ? 0 : 1,
        transform: out ? "scale(0.9) translateY(6px)" : undefined,
        transition: "opacity .35s ease, transform .35s ease",
      }}
    >
      <div className="font-extrabold text-amber-300 text-base md:text-lg leading-tight">{word.w}</div>
      <div className="text-[10px] tracking-[0.2em] opacity-60 font-semibold">{word.c} · GERMAN</div>
      {/* caret pointing toward the globe */}
      <span
        aria-hidden="true"
        className={`bubble-caret ${index < 2 ? "caret-down" : "caret-up"}`}
        style={{ display: "block" }}
      />
    </div>
  );
}

export default function HeroGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let W = 0, H = 0;

    /* fibonacci sphere points (unit vectors) */
    const COUNT = 700;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const pts: [number, number, number][] = [];
    for (let i = 0; i < COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / COUNT);
      const theta = golden * i;
      pts.push([
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      ]);
    }

    /* wireframe rings */
    const LATS = [-0.8, -0.4, 0, 0.4, 0.8].map((s) => {
      const r = Math.sqrt(1 - s * s);
      const ring: [number, number, number][] = [];
      for (let a = 0; a <= 64; a++) {
        const t = (a / 64) * Math.PI * 2;
        ring.push([r * Math.cos(t), s, r * Math.sin(t)]);
      }
      return ring;
    });
    const LONS: [number, number, number][][] = [];
    for (let k = 0; k < 8; k++) {
      const az = (k / 8) * Math.PI;
      const ring: [number, number, number][] = [];
      for (let a = 0; a <= 64; a++) {
        const t = (a / 64) * Math.PI * 2;
        ring.push([Math.sin(t) * Math.cos(az), Math.cos(t), Math.sin(t) * Math.sin(az)]);
      }
      LONS.push(ring);
    }

    let rotY = 0;
    let tiltX = 0, tiltY = 0, targetTiltX = 0, targetTiltY = 0;
    const BASE_TILT = 0.42;
    let last = performance.now();

    /* surface words: DOM spans glued to fixed sphere points — same math as
       the particles every frame, so they rotate/tilt in perfect sync */
    const host = canvas.parentElement!;
    const surfaceSpans: { span: HTMLSpanElement; p: [number, number, number] }[] = [];
    const swCount = window.innerWidth < 768 ? 5 : SURFACE_WORDS.length;
    for (let i = 0; i < swCount; i++) {
      const pIdx = Math.floor((i + 0.5) * (COUNT / swCount)); // spread across the sphere
      const span = document.createElement("span");
      span.textContent = SURFACE_WORDS[i];
      span.style.position = "absolute";
      span.style.left = "0";
      span.style.top = "0";
      span.style.color = "#fbbf24";
      span.style.fontWeight = "800";
      span.style.pointerEvents = "none";
      span.style.userSelect = "none";
      span.style.whiteSpace = "nowrap";
      span.style.zIndex = "15";
      span.style.willChange = "transform, opacity";
      span.style.textShadow = "0 0 16px rgba(251,191,36,0.45), 0 1px 3px rgba(0,0,0,0.6)";
      host.appendChild(span);
      surfaceSpans.push({ span, p: pts[pIdx] });
    }

    const resize = () => {
      const parent = canvas.parentElement!;
      W = parent.clientWidth;
      H = parent.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      targetTiltX = -((e.clientY - (r.top + r.height / 2)) / r.height) * 0.35;
      targetTiltY = ((e.clientX - (r.left + r.width / 2)) / r.width) * 0.5;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const project = (x: number, y: number, z: number) => {
      /* rotate Y then X */
      const cosY = Math.cos(rotY + tiltY), sinY = Math.sin(rotY + tiltY);
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;
      const c = Math.cos(BASE_TILT + tiltX), s = Math.sin(BASE_TILT + tiltX);
      const y2 = y * c - z1 * s;
      const z2 = y * s + z1 * c;
      return { x: x1, y: y2, z: z2 };
    };

    const draw = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      ctx.clearRect(0, 0, W, H);
      if (!document.hidden) {
        rotY += dt * 0.00016;
        tiltX += (targetTiltX - tiltX) * 0.05;
        tiltY += (targetTiltY - tiltY) * 0.05;
      }

      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.40;
      const focal = R * 3;

      /* wireframe rings */
      ctx.lineWidth = 1;
      for (const ring of [...LATS, ...LONS]) {
        ctx.beginPath();
        let started = false;
        for (const [x, y, z] of ring) {
          const p = project(x, y, z);
          const persp = focal / (focal - p.z * R);
          const sx = cx + p.x * R * persp;
          const sy = cy + p.y * R * persp;
          if (p.z > 0) {
            if (!started) { ctx.moveTo(sx, sy); started = true; }
            else ctx.lineTo(sx, sy);
          } else started = false; // hide back-side rings
        }
        ctx.strokeStyle = "rgba(251,191,36,0.10)";
        ctx.stroke();
      }

      /* particles */
      for (const [x, y, z] of pts) {
        const p = project(x, y, z);
        const persp = focal / (focal - p.z * R);
        const sx = cx + p.x * R * persp;
        const sy = cy + p.y * R * persp;
        const front = (p.z + 1) / 2; // 0 back → 1 front
        const size = 1.2 + front * 2.2;
        const alpha = 0.08 + front * 0.8;
        ctx.fillStyle = front > 0.75
          ? `rgba(251,191,36,${alpha.toFixed(2)})`
          : `rgba(226,232,240,${alpha.toFixed(2)})`;
        ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
      }

      /* surface words — glued to the sphere, visible on the front only */
      for (const { span, p: [x, y, z] } of surfaceSpans) {
        const p = project(x, y, z);
        const persp = focal / (focal - p.z * R);
        const sx = cx + p.x * R * persp;
        const sy = cy + p.y * R * persp;
        const front = (p.z + 1) / 2; // 0 back → 1 front
        const vis = Math.max(0, Math.min(1, (front - 0.45) / 0.35)); // fades in near the front
        const scale = 0.72 + front * 0.5;
        span.style.opacity = String(vis * 0.95);
        span.style.transform = `translate(-50%,-50%) translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) scale(${scale.toFixed(2)})`;
        span.style.filter = vis < 0.4 ? "blur(1.5px)" : "none";
        span.style.fontSize = `clamp(0.85rem, ${R * 0.011}vw + 0.45rem, 1.35rem)`;
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      ro.disconnect();
      for (const { span } of surfaceSpans) span.remove();
    };
  }, []);

  return (
    <div className="relative w-full aspect-square mx-auto globe-zoom-in">
      {/* halo glow */}
      <div
        aria-hidden="true"
        className="absolute -inset-14 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(251,191,36,0.2) 0%, rgba(251,191,36,0.06) 40%, transparent 70%)" }}
      />
      {/* globe */}
      <canvas ref={canvasRef} className="relative z-10" aria-hidden="true" />
      {/* ground shadow */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-[66%] h-7 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(251,191,36,0.3) 0%, transparent 70%)", filter: "blur(7px)" }}
      />
      {/* foreground flying words — cinematic drift across the globe's face */}
      {["Egal.", "Ach so!", "Doch!"].map((w, i) => (
        <span
          key={w}
          aria-hidden="true"
          className="fly-across absolute z-20 font-extrabold text-amber-300/60 pointer-events-none select-none"
          style={{
            top: `${24 + i * 22}%`,
            animationDelay: `${i * 3.2}s`,
            animationDuration: `${11 + i * 2.5}s`,
            fontSize: "clamp(1rem, 2vw, 1.5rem)",
            textShadow: "0 0 22px rgba(251,191,36,0.4)",
          }}
        >
          {w}
        </span>
      ))}
      {/* orbiting speech bubbles */}
      {BUBBLE_POS.map((_, i) => (
        <Bubble key={i} index={i} reduced={reduced} />
      ))}
      {/* sparkles */}
      <span aria-hidden="true" className="twinkle absolute text-amber-300/70 text-2xl" style={{ left: "10%", top: "28%" }}>✦</span>
      <span aria-hidden="true" className="twinkle absolute text-amber-300/60 text-xl hidden sm:inline" style={{ right: "8%", top: "6%", animationDelay: "1.2s" }}>✦</span>
      <span aria-hidden="true" className="twinkle absolute text-amber-300/50 text-lg hidden sm:inline" style={{ left: "16%", bottom: "4%", animationDelay: "2.1s" }}>✦</span>
      <span aria-hidden="true" className="twinkle absolute text-amber-200/40 text-2xl hidden md:inline" style={{ right: "14%", bottom: "22%", animationDelay: "0.7s" }}>✦</span>
      <span aria-hidden="true" className="twinkle absolute text-amber-200/40 text-lg hidden md:inline" style={{ left: "40%", top: "-2%", animationDelay: "1.8s" }}>✦</span>
      {/* caption */}
      <p className="absolute -bottom-9 left-1/2 -translate-x-1/2 text-xs opacity-50 whitespace-nowrap">
        🖱️ A world of German worth exploring
      </p>
    </div>
  );
}
