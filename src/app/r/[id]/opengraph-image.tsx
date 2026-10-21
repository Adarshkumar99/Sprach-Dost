import { ImageResponse } from "next/og";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const alt = "SprachDost exam result";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

let admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!admin) admin = createClient(url, key, { auth: { persistSession: false } });
  return admin;
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  type OgData = { overall: number; level: string; label: string; name: string };
  let data: OgData | null = null;
  const sb = getAdmin();
  if (sb) {
    const { data: row } = await sb.from("shared_results").select("data").eq("id", id).maybeSingle();
    data = (row?.data as OgData | null) ?? null;
  }
  const overall = data?.overall ?? 0;
  const label = data?.label ?? "Goethe mock";
  const level = data?.level ?? "A1";
  const name = data?.name ?? "German Learner";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b1020 0%, #1a1040 60%, #3b0d0d 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "rgba(255,255,255,0.55)", marginBottom: 24 }}>
          SPRACHDOST — INDIA WILL SPEAK GERMAN 🇩🇪
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "rgba(255,255,255,0.8)", marginBottom: 8 }}>
          {name} scored
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 170,
            fontWeight: 800,
            background: "linear-gradient(135deg, #dc2626, #f59e0b, #fbbf24)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            lineHeight: 1,
          }}
        >
          {overall}%
        </div>
        <div style={{ display: "flex", fontSize: 38, marginTop: 20, opacity: 0.85 }}>
          {label} • Level {level}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 36,
            fontSize: 30,
            padding: "14px 42px",
            borderRadius: 999,
            background: "linear-gradient(135deg, #dc2626, #f59e0b)",
            color: "#000",
            fontWeight: 700,
          }}
        >
          Beat me — start free →
        </div>
      </div>
    ),
    { ...size }
  );
}
