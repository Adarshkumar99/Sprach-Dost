"use client";

/**
 * Web Push for the daily Word of the Day.
 * Needs: NEXT_PUBLIC_VAPID_PUBLIC_KEY (server side: VAPID_PRIVATE_KEY etc. — see .env.local.example).
 */

import { pushProgressToCloud } from "./supabase";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function pushConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

export function currentPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

/** register the service worker (idempotent) */
export async function ensureSW(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

/** ask permission + subscribe + store on the server. Returns error string or null. */
export async function enableWotDPush(): Promise<string | null> {
  if (!pushSupported()) return "This browser does not support push notifications.";
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) return "Push is not configured on the server yet.";

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "Notification permission was denied.";

  const reg = await ensureSW();
  if (!reg) return "Could not register the service worker.";

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid),
  });

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return data.error ?? "Could not save the subscription.";
  }
  localStorage.setItem("sprachdost_wotd_push", "1");
  pushProgressToCloud();
  return null;
}

export async function disableWotDPush(): Promise<void> {
  localStorage.removeItem("sprachdost_wotd_push");
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      }).catch(() => {});
      await sub.unsubscribe();
    }
  } catch {
    /* best effort */
  }
}
