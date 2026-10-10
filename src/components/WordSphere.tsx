"use client";

import { useEffect, useRef } from "react";

/**
 * Floating 3D sphere of iconic German words — pure CSS/DOM, zero deps.
 * Fibonacci-distributed points on a globe, rotated per frame (GPU transforms),
 * depth-driven opacity/blur/scale, mouse parallax tilt, slow word swap-in/out.
 * Respects prefers-reduced-motion → renders a static scatter instead.
 */

const SLANG = [
  "Egal.", "Ach so!", "Na klar", "Genau", "Doch!", "Alles klar", "Los geht's",
  "Stimmt", "Quatsch!", "Mensch!", "Tja", "Servus", "Moin", "Echt?", "Krass",
  "Wunderbar", "Kein Ding", "Na?", "Ach was!", "Logisch",
];
const UMLAUT = [
  "schön", "über", "müsste", "für", "Türen", "Ärger", "früh", "Hände", "Küche",
  "Übung", "süß", "groß", "Straße", "heiß", "Spaß", "Flöte", "Möbel", "hören",
  "Öl", "Köpfe",
];
const POOL = [...SLANG, ...UMLAUT];

type Item = {
  span: HTMLSpanElement;
  // base spherical coords
  theta: number; // azimuth
  phi: number;   // polar
  fade: number;  // 0..1 alpha multiplier (for swap transitions)
  fadeTarget: number;
  word: string;
};

export default function WordSphere() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmall = window.innerWidth < 768;

    /* fibonacci sphere points */
    const N = isSmall ? 20 : 32;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const shuffledPool = [...POOL].sort(() => Math.random() - 0.5);

    const items: Item[] = [];
    for (let i = 0; i < N; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / N);
      const theta = golden * i;
      const span = document.createElement("span");
      const word = shuffledPool[i % shuffledPool.length];
      span.textContent = word;
      span.style.position = "absolute";
      span.style.left = "50%";
      span.style.top = "50%";
      span.style.whiteSpace = "nowrap";
      span.style.fontWeight = "700";
      span.style.willChange = "transform, opacity";
      span.style.userSelect = "none";
      host.appendChild(span);
      items.push({ span, theta, phi, fade: 1, fadeTarget: 1, word });
    }

    if (reduced) {
      // static, gentle scatter — no motion
      const w = host.clientWidth, h = host.clientHeight;
      const R = Math.min(w, h) * 0.42;
      for (const it of items) {
        const x = R * Math.sin(it.phi) * Math.cos(it.theta);
        const y = R * Math.cos(it.phi) * 0.8;
        const size = 14 + Math.random() * 12;
        it.span.style.fontSize = `${size}px`;
        it.span.style.opacity = "0.25";
        it.span.style.color = "#fbbf24";
        it.span.style.transform = `translate(-50%,-50%) translate(${x}px, ${y}px)`;
      }
      return () => { host.innerHTML = ""; };
    }

    let raf = 0;
    let rotY = 0;
    let rotX = 0.12;
    let tiltX = 0, tiltY = 0;       // smoothed parallax
    let targetTiltX = 0, targetTiltY = 0;
    let last = performance.now();
    let swapTimer = 0;

    const onMove = (e: MouseEvent) => {
      const r = host.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width / 2)) / r.width;   // -0.5..0.5
      const ny = (e.clientY - (r.top + r.height / 2)) / r.height;
      targetTiltY = nx * 0.55;
      targetTiltX = -ny * 0.4;
    };
    if (!isSmall) window.addEventListener("mousemove", onMove, { passive: true });

    const frame = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }

      rotY += dt * 0.00022;                        // slow spin
      rotX = 0.12 + Math.sin(now * 0.00012) * 0.08; // gentle wobble
      tiltX += (targetTiltX - tiltX) * 0.04;       // smooth parallax
      tiltY += (targetTiltY - tiltY) * 0.04;

      const w = host.clientWidth, h = host.clientHeight;
      const R = Math.min(w, h) * (isSmall ? 0.5 : 0.46);
      const baseFont = Math.max(16, Math.min(w, h) * 0.032);

      const totalTiltX = rotX + tiltX;
      const totalTiltY = rotY + tiltY;
      const cosY = Math.cos(totalTiltY), sinY = Math.sin(totalTiltY);
      const cosX = Math.cos(totalTiltX), sinX = Math.sin(totalTiltX);

      /* word swap: every ~3.5s retire one word, bring in a fresh one */
      swapTimer += dt;
      if (swapTimer > 3500) {
        swapTimer = 0;
        const cand = items.filter((it) => it.fadeTarget === 1);
        if (cand.length) {
          const pickIt = cand[Math.floor(Math.random() * cand.length)];
          pickIt.fadeTarget = 0; // start fading out
        }
      }

      for (const it of items) {
        /* fade transitions for swapping */
        if (it.fade !== it.fadeTarget) {
          it.fade += (it.fadeTarget - it.fade) * 0.06;
          if (Math.abs(it.fade - it.fadeTarget) < 0.03) {
            it.fade = it.fadeTarget;
            if (it.fade === 0) {
              // fully out → replace word & re-enter elsewhere
              const unused = POOL.filter((p) => !items.some((o) => o.word === p));
              it.word = unused.length ? unused[Math.floor(Math.random() * unused.length)] : POOL[Math.floor(Math.random() * POOL.length)];
              it.span.textContent = it.word;
              it.theta = Math.random() * Math.PI * 2;
              it.phi = Math.acos(2 * Math.random() - 1);
              it.fadeTarget = 1;
            }
          }
        }

        /* rotate point: first around Y, then around X */
        const x0 = R * Math.sin(it.phi) * Math.cos(it.theta);
        const y0 = R * Math.cos(it.phi);
        const z0 = R * Math.sin(it.phi) * Math.sin(it.theta);

        const x1 = x0 * cosY + z0 * sinY;
        const z1 = -x0 * sinY + z0 * cosY;
        const y1 = y0;

        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;

        const depth = (z2 + R) / (2 * R); // 0 = back, 1 = front
        const scale = 0.6 + depth * 0.7;
        const size = baseFont * scale;
        const opacity = it.fade * (0.07 + depth * 0.85);
        const blur = (1 - depth) * 2.2;

        const front = depth > 0.72;
        it.span.style.fontSize = `${size}px`;
        it.span.style.opacity = String(opacity);
        it.span.style.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : "none";
        it.span.style.color = front ? "#fbbf24" : "#e2e8f0";
        it.span.style.textShadow = front ? "0 0 18px rgba(251,191,36,0.5)" : "none";
        it.span.style.transform = `translate(-50%,-50%) translate(${x1.toFixed(1)}px, ${y2.toFixed(1)}px)`;
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      if (!isSmall) window.removeEventListener("mousemove", onMove);
      host.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
    />
  );
}
