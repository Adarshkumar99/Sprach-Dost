"use client";

import { useCallback, useEffect, useState } from "react";
import {
  pushSupported,
  pushConfigured,
  currentPermission,
  enableWotDPush,
  disableWotDPush,
} from "@/lib/push";

/** small toggle card — daily Word of the Day push notification */
export default function WotDPushCard() {
  const [state, setState] = useState<"loading" | "on" | "off" | "denied" | "unsupported" | "unconfigured">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(() => {
    if (!pushSupported()) setState("unsupported");
    else if (!pushConfigured()) setState("unconfigured");
    else if (localStorage.getItem("sprachdost_wotd_push") === "1" && currentPermission() === "granted") setState("on");
    else if (currentPermission() === "denied") setState("denied");
    else setState("off");
  }, []);

  useEffect(() => {
    queueMicrotask(detect);
  }, [detect]);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      if (state === "on") {
        await disableWotDPush();
        detect();
      } else {
        const err = await enableWotDPush();
        if (err) setError(err);
        detect();
      }
    } finally {
      setBusy(false);
    }
  };

  if (state === "unsupported" || state === "unconfigured") return null;

  return (
    <div className="glass rounded-3xl p-5 w-full max-w-4xl mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="text-center sm:text-left">
        <div className="font-bold">🔔 Daily Word of the Day</div>
        <div className="text-xs opacity-60 mt-0.5">
          {state === "on"
            ? "Enabled — we'll ping you every morning (6 AM IST) with a German word."
            : state === "denied"
              ? "Notifications are blocked — enable them in your browser site settings, then reload."
              : "Get a German word pushed to your phone every morning."}
        </div>
        {error && <div className="text-xs text-red-300 mt-1">{error}</div>}
      </div>
      <button
        onClick={toggle}
        disabled={busy || state === "denied"}
        className={`text-sm rounded-full px-5 py-2.5 font-bold shrink-0 ${
          state === "on" ? "glass hover:bg-white/10" : "btn-primary !py-2.5"
        } ${busy ? "opacity-60" : ""}`}
      >
        {busy ? "…" : state === "on" ? "Turn off" : "🔔 Enable"}
      </button>
    </div>
  );
}
