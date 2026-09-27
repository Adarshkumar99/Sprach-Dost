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

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 500,
        messages: [
          { role: "system", content: system },
          ...messages.slice(-12),
        ],
      }),
    });

    if (!res.ok) {
      const errTxt = await res.text();
      if (res.status === 400 || res.status === 404) {
        const retry = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
            max_tokens: 500,
            messages: [{ role: "system", content: system }, ...messages.slice(-12)],
          }),
        });
        if (retry.ok) {
          const d = await retry.json();
          return NextResponse.json({ reply: d.choices[0].message.content as string });
        }
      }
      return NextResponse.json({ error: errTxt }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ reply: data.choices[0].message.content as string });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
