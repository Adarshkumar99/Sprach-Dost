import { NextResponse } from "next/server";
import crypto from "crypto";
import { EdgeTTS } from "node-edge-tts";

export const runtime = "nodejs";

/**
 * Neural TTS chain (cheapest → best → free):
 *   1. edge-tts  — Microsoft Edge neural voices, FREE, no API key (default)
 *   2. ElevenLabs — only if ELEVENLABS_API_KEY is set
 *   3. { fallback: true } → client uses the free browser voice
 *
 * Voices:
 *   German  female → de-DE-KatjaNeural, male → de-DE-ConradNeural
 *   English (IN)   → en-IN-NeerjaNeural / en-IN-PrabhatNeural
 */

type VoiceOpts = { voice: string; lang: string };

function pickVoice(lang: string, genderHint?: "anna" | "lehrer"): VoiceOpts {
  const l = lang.toLowerCase();
  if (l.startsWith("de")) {
    return genderHint === "lehrer"
      ? { voice: "de-DE-ConradNeural", lang: "de-DE" }
      : { voice: "de-DE-KatjaNeural", lang: "de-DE" };
  }
  if (l.startsWith("en-in")) {
    return genderHint === "lehrer"
      ? { voice: "en-IN-PrabhatNeural", lang: "en-IN" }
      : { voice: "en-IN-NeerjaNeural", lang: "en-IN" };
  }
  return { voice: "en-US-AriaNeural", lang: "en-US" };
}

/* tiny in-memory cache — repeated sentences (avatars, exams) cost zero repeat calls */
const CACHE = new Map<string, Buffer>();
const CACHE_MAX = 300;

function cacheKey(text: string, voice: string): string {
  return crypto.createHash("sha1").update(`${voice}::${text}`).digest("hex");
}

async function edgeTtsBuffer(text: string, opts: VoiceOpts): Promise<Buffer | null> {
  try {
    const tts = new EdgeTTS({ voice: opts.voice, lang: opts.lang, timeout: 15000 });
    const chunks: Buffer[] = [];
    for await (const chunk of tts.streamAudio(text.slice(0, 1200))) {
      if (Buffer.isBuffer(chunk)) chunks.push(chunk);
    }
    const buf = Buffer.concat(chunks);
    return buf.length > 500 ? buf : null; // too small = failure
  } catch {
    return null;
  }
}

async function elevenLabsBuffer(text: string): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;
  try {
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
        }),
      }
    );
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const text: string = String(body?.text ?? "").slice(0, 1200);
  const lang: string = String(body?.lang ?? "de-DE");
  const genderHint = body?.gender === "lehrer" ? "lehrer" : body?.gender === "anna" ? "anna" : undefined;
  if (!text.trim()) return NextResponse.json({ error: "empty text" }, { status: 400 });

  const opts = pickVoice(lang, genderHint);
  const key = cacheKey(text, opts.voice);
  const cached = CACHE.get(key);
  if (cached) {
    return new Response(new Uint8Array(cached), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400" },
    });
  }

  // 1) edge-tts (free, default)
  const edge = await edgeTtsBuffer(text, opts);
  if (edge) {
    if (CACHE.size >= CACHE_MAX) {
      const first = CACHE.keys().next().value;
      if (first) CACHE.delete(first);
    }
    CACHE.set(key, edge);
    return new Response(new Uint8Array(edge), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400" },
    });
  }

  // 2) ElevenLabs (only if key configured)
  const el = await elevenLabsBuffer(text);
  if (el) {
    if (CACHE.size >= CACHE_MAX) {
      const first = CACHE.keys().next().value;
      if (first) CACHE.delete(first);
    }
    CACHE.set(key, el);
    return new Response(new Uint8Array(el), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400" },
    });
  }

  // 3) client falls back to the free browser voice
  return NextResponse.json({ fallback: true });
}
