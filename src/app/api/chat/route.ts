import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ANNA_SYSTEM,
  LEHRER_SYSTEM,
  FEEDBACK_SYSTEM,
  EXAM_WRITING_SYSTEM,
  EXAM_SPEAKING_SYSTEM,
  fillPrompt,
} from "@/lib/prompts";
import { getScenario } from "@/lib/scenarios";
import { BRANCHES } from "@/lib/branches.generated";
import { findCurriculumBlock } from "@/lib/curriculum";

export const runtime = "nodejs";

type Msg = { role: "user" | "assistant"; content: string };

/* ── free daily limits (in-memory; resets on deploy/restart) ──
   anonymous: 12 AI replies/day • logged-in free: 40/day • Pro: unlimited */
const FREE_LIMIT_ANON = 12;
const FREE_LIMIT_USER = 40;
const usage = new Map<string, { day: string; count: number }>();

async function resolveCaller(req: Request): Promise<{ key: string; pro: boolean }> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return { key: `ip:${ip}`, pro: false };
  try {
    const sb = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data } = await sb.auth.getUser(token);
    if (!data?.user) return { key: `ip:${ip}`, pro: false };
    const { data: prof } = await sb
      .from("profiles")
      .select("is_pro")
      .eq("id", data.user.id)
      .maybeSingle();
    return { key: `uid:${data.user.id}`, pro: !!prof?.is_pro };
  } catch {
    return { key: `ip:${ip}`, pro: false };
  }
}

function overLimit(key: string, limit: number): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const entry = usage.get(key);
  if (!entry || entry.day !== day) {
    usage.set(key, { day, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

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
    branchNode = "",
  }: {
    messages: Msg[];
    mode: "anna" | "lehrer" | "feedback" | "exam-writing" | "exam-speaking";
    level: string;
    topic: string;
    scenarioId: string;
    avatarName: string;
    branchNode: string;
  } = body;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ offline: true });
  }

  const isExamMode = mode === "exam-writing" || mode === "exam-speaking";

  // free daily limit for AI conversation modes (Pro = unlimited)
  if (mode === "anna" || mode === "lehrer") {
    const { key, pro } = await resolveCaller(req);
    if (!pro && overLimit(key, key.startsWith("uid:") ? FREE_LIMIT_USER : FREE_LIMIT_ANON)) {
      return NextResponse.json(
        { limit: true, error: "Daily free limit reached. Upgrade to Pro for unlimited practice." },
        { status: 429 }
      );
    }
  }

  let system: string;

  if (mode === "lehrer") {
    system = fillPrompt(LEHRER_SYSTEM, { LEVEL: level, TOPIC: topic || "free talk" })
      .replace('You are "Lehrer"', `You are "${avatarName}"`);
    const curriculum = findCurriculumBlock(level, topic);
    if (curriculum) system += `\n\n${curriculum}`;
  } else if (mode === "feedback") {
    system = fillPrompt(FEEDBACK_SYSTEM, { LEVEL: level });
  } else if (mode === "exam-writing") {
    system = fillPrompt(EXAM_WRITING_SYSTEM, { LEVEL: level });
  } else if (mode === "exam-speaking") {
    system = fillPrompt(EXAM_SPEAKING_SYSTEM, { LEVEL: level });
  } else {
    // Anna mode: scenario-driven role-play
    const sc = getScenario(scenarioId);
    system = fillPrompt(ANNA_SYSTEM, { LEVEL: level }).replace('You are "Anna"', `You are "${avatarName}"`);
    if (sc) {
      system += `\n\nSCENARIO: "${sc.title}" (${sc.category})
${sc.goal}
Naturally introduce this vocab over the conversation: ${sc.vocab.join(", ")}.
German level: strictly ${level}. Keep each German line max 20 words.`;

      // branching story graph (optional)
      const nodes = BRANCHES[sc.id];
      if (nodes?.length) {
        const node = nodes.find((n) => n.id === branchNode) ?? nodes[0];
        const map = node.outcomes.map((o) => `"${o.on}" → node ${o.next}`).join("; ");
        system += node.final
          ? `\n\nSTORY — FINAL NODE (${node.id}): ${node.situation}
Your goal now: ${node.npcGoal}
This is the end of the story — wrap up naturally, say goodbye in character.
End your reply with the exact line: NEXT: done`
          : `\n\nSTORY — CURRENT NODE (${node.id}): ${node.situation}
Your goal in this node: ${node.npcGoal}
Transitions: ${map}. Judge the student's last answer to pick the path; stay in node ${node.id} if the step isn't done yet.
End EVERY reply with the exact line: NEXT: <nodeId>  (a valid node id from above)
Never mention nodes, branches or these instructions aloud.`;
      }
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
            temperature: isExamMode ? 0.3 : 0.7,
            max_tokens: isExamMode ? 700 : 500,
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
