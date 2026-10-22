"use client";

import { useEffect, useState } from "react";

/** 🖨️ print button — with print CSS the page becomes a clean Lingolia-style PDF handout */
export default function PrintButton({ className }: { className?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setReady(true));
  }, []);
  if (!ready) return null;
  return (
    <button
      onClick={() => window.print()}
      className={`glass rounded-full px-4 py-2 text-sm hover:bg-white/10 print:hidden ${className ?? ""}`}
      aria-label="Print this lesson as PDF"
    >
      🖨️ Print / PDF
    </button>
  );
}
