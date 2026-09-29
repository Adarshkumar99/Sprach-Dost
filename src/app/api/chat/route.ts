import { NextResponse } from "next/server";
import { ANNA_SYSTEM, LEHRER_SYSTEM, FEEDBACK_SYSTEM, fillPrompt } from "@/lib/prompts";
import { getScenario } from "@/lib/scenarios";
import { findCurriculumBlock } from "@/lib/curriculum";

export const runtime = "nodejs";

type Msg = { role: "user" | "assistant"; content: string };

/**
 * FREE LLM endpoint — Groq free tier (no card needed).
 * If GROQ_API_KEY missing → { offline: true }, client shows setup instructions.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const {
    messages = [] as Msg[],
    mode = "anna",
    level = "A1",
    topic = "",
    scenarioId = "",
    avatarName = "Anna",
  }: {
    messages: Msg[];
    mode: "anna" | "lehrer" | "feedback";
    level: string;
    topic: string;
    scenarioId: string;
    avatarName: string;
  } = body;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ offline: true });
  }

  let system: string;

  if (mode === "lehrer") {
    system = fillPrompt(LEHRER_SYSTEM, { LEVEL: level, TOPIC: topic || "free talk" })
      .replace('You are "Lehrer"', `You are "${avatarName}"`);
    const curriculum = findCurriculumBlock(level, topic);
    if (curriculum) system += `\n\n${curriculum}`;
  } else if (mode === "feedback") {
    system = fillPrompt(FEEDBACK_SYSTEM, { LEVEL: level });
  } else {
    // Anna mode: scenario-driven role-play
    const sc = getScenario(scenarioId);
    system = fillPrompt(ANNA_SYSTEM, { LEVEL: level }).replace('You are "Anna"', `You are "${avatarName}"`);
    if (sc) {
      system += `\n\nSCENARIO: "${sc.title}" (${sc.category})
${sc.goal}
Naturally introduce this vocab over the conversation: ${sc.vocab.join(", ")}.
German level: strictly ${level}. Keep each German line max 20 words.`;
    } else {
      system += `\n\nSCENARIO: Free conversation about everyday life in Germany. Friendly, level ${level}.`;
    }
  }

  // Model priority: env override → preferred → fallbacks (Groq retires models over time)
  const MODELS = [
    process.env.GROQ_MODEL,
    "llama-3.1-8b-instant",
    "openai/gpt-oss-120b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
  ].filter((m): m is string => Boolean(m));

  try {
    const allMessages = [
      { role: "system" as const, content: system },
      ...messages.slice(-12),
    ];

    let lastError = "no model responded";

    for (const model of MODELS) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.7,
            max_tokens: 500,
            messages: allMessages,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) return NextResponse.json({ reply, model });
        }
        lastError = await res.text();
        continue; // try next model on ANY failure
      } catch (e: unknown) {
        lastError = e instanceof Error ? e.message : "fetch failed";
        continue;
      }
    }

    return NextResponse.json({ error: lastError, tried: MODELS }, { status: 502 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
