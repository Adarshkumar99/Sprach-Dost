import { enforceAiLimit } from "@/lib/aiLimits";
import { VOICE_SYSTEM, fillPrompt } from "@/lib/prompts";

export const runtime = "nodejs";

type Msg = { role: "user" | "assistant"; content: string };

/**
 * Streaming Free-Talk endpoint — Groq SSE → our SSE (plain text deltas).
 * Voice mode uses the shared daily limit (Pro unlimited).
 */

const MODELS = [
  process.env.GROQ_MODEL,
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
].filter((m): m is string => Boolean(m));

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ offline: true }, { status: 200 });
  }

  const body = await req.json().catch(() => ({}));
  const messages: Msg[] = Array.isArray(body?.messages) ? body.messages.slice(-12) : [];
  const level: string = String(body?.level ?? "A1");
  const topic: string = String(body?.topic ?? "free");
  const avatarName: string = String(body?.avatarName ?? "Anna");

  const limited = await enforceAiLimit(req);
  if (limited) return limited;

  const system = fillPrompt(VOICE_SYSTEM, { LEVEL: level, TOPIC: topic || "free", AVATAR: avatarName });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          /* client gone */
        }
      };

      for (const model of MODELS) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              temperature: 0.8,
              max_tokens: 400,
              stream: true,
              messages: [{ role: "system", content: system }, ...messages],
            }),
          });
          if (!res.ok || !res.body) {
            await res.text().catch(() => "");
            continue; // next model
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          let sent = false;
          send({ start: true, model });

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              const t = line.trim();
              if (!t.startsWith("data:")) continue;
              const payload = t.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const j = JSON.parse(payload);
                const delta = j.choices?.[0]?.delta?.content;
                if (delta) {
                  sent = true;
                  send({ delta });
                }
              } catch {
                /* partial json line */
              }
            }
          }
          if (sent) {
            send({ done: true });
            controller.close();
            return;
          }
        } catch {
          /* try next model */
        }
      }
      send({ error: "no model responded" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
