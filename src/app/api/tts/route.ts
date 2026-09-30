import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Optional high-quality neural voices (ElevenLabs).
 * If ELEVENLABS_API_KEY is not configured → { fallback: true } and the client
 * automatically uses the free browser voice instead. Zero cost by default.
 *
 * Env:
 *   ELEVENLABS_API_KEY      — from elevenlabs.io
 *   ELEVENLABS_VOICE_ID     — optional voice override (multilingual voices handle German well)
 */
export async function POST(req: Request) {
  const body = await req.json();
  const text: string = String(body.text ?? "").slice(0, 600);
  if (!text.trim()) return NextResponse.json({ error: "empty text" }, { status: 400 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return NextResponse.json({ fallback: true });

  const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel (multilingual v2 handles German)

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ fallback: true, reason: await res.text() });
    }

    const audio = await res.arrayBuffer();
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { fallback: true, reason: e instanceof Error ? e.message : "unknown" },
      { status: 200 }
    );
  }
}
