#!/usr/bin/env node
/**
 * Branching role-play generator — for every scenario in src/lib/scenarios.ts
 * it designs a small decision-tree story graph (4-6 nodes) via Groq.
 * Output: src/lib/branches.generated.ts
 *
 * Safe to re-run — resumes, never regenerates scenarios that already have nodes.
 *
 * Usage:
 *   GROQ_API_KEY in .env.local
 *   node scripts/generate-branches.mjs           → all scenarios
 *   ONLY=cafe,restaurant node scripts/...        → subset
 *   FORCE=1 node scripts/...                     → regenerate everything
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

try {
  const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* fall through */ }

const KEY = process.env.GROQ_API_KEY;
if (!KEY) { console.error("❌ GROQ_API_KEY missing in .env.local"); process.exit(1); }

const MODELS = [
  process.env.GROQ_MODEL,
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "llama-3.1-8b-instant",
].filter(Boolean);

const OUT_FILE = path.join(ROOT, "src", "lib", "branches.generated.ts");
const FORCE = process.env.FORCE === "1";
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const deadToday = new Set();

async function callGroq(prompt, maxTokens) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    if (deadToday.has(model)) continue;
    if (deadToday.size >= MODELS.length) return null;
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model, temperature: 0.6, max_completion_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 429) {
          if (/tokens per day/i.test(txt)) { deadToday.add(model); continue; }
          const w = txt.match(/try again in ([\d.]+)s/i);
          const waitS = w ? Math.ceil(Number(w[1])) : 20;
          console.log(`    [${model}] rate limit — waiting ${waitS}s`);
          await sleep(waitS * 1000 + 500);
          continue;
        }
        console.log(`    [${model}] ${res.status}: ${txt.slice(0, 90)}`);
        await sleep(1500);
        continue;
      }
      return await res.json();
    } catch (e) {
      console.log(`    [${model}] error: ${String(e).slice(0, 90)}`);
      await sleep(2000);
    }
  }
  return null;
}

/** extract id / title / level / goal from the TS source (resumable & dependency-free) */
function extractScenarios() {
  const src = fs.readFileSync(path.join(ROOT, "src", "lib", "scenarios.ts"), "utf-8");
  const out = [];
  const idRe = /id:\s*"([^"]+)"/g;
  let m;
  const marks = [];
  while ((m = idRe.exec(src))) marks.push({ id: m[1], start: m.index });
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].start : src.length;
    const block = src.slice(marks[i].start, end);
    const title = block.match(/title:\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? "";
    const level = block.match(/level:\s*"([AB][12])"/)?.[1] ?? "B1";
    const goal = block.match(/goal:\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? "";
    if (!goal) { console.warn(`  ⚠ no goal found for ${marks[i].id} — skipping`); continue; }
    out.push({ id: marks[i].id, title, level, goal });
  }
  return out;
}

function validate(nodes) {
  if (!Array.isArray(nodes) || nodes.length < 3 || nodes.length > 7) return "size";
  const ids = new Set(nodes.map((n) => n.id));
  if (nodes[0].id !== "n1") return "start";
  let hasFinal = false;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n.id || typeof n.situation !== "string" || !n.situation ||
        typeof n.npcGoal !== "string" || !n.npcGoal || !Array.isArray(n.outcomes)) return "fields";
    if (n.final) {
      hasFinal = true;
      if (n.outcomes.length !== 0) return "final-outcomes";
      if (i !== nodes.length - 1) return "final-position";
    } else {
      if (n.outcomes.length < 1) return "no-outcomes";
      for (const o of n.outcomes) {
        if ((o.on !== "good" && o.on !== "bad") || !ids.has(o.next)) return "next";
        if (o.next === n.id) return "self-loop";
      }
      if (!n.outcomes.some((o) => o.on === "good")) return "no-good";
    }
  }
  if (!hasFinal) return "no-final";
  return null;
}

async function genGraph(sc) {
  const prompt = `Design a branching story graph for a German role-play scenario for a CEFR ${sc.level} learner.

Scenario: "${sc.title}" — ${sc.goal}

Return ONLY valid JSON, no markdown:
{"nodes":[
 {"id":"n1","situation":"1-2 sentences in English: the situation the student is in right now and what they must handle","npcGoal":"one sentence: what you (the German-speaking partner) try to achieve in this node","outcomes":[{"on":"good","next":"n2"},{"on":"bad","next":"n3"}]},
 ... 4-6 nodes total ...
]}

Rules:
- "n1" is always the start node.
- The LAST node has "final": true and "outcomes": [].
- "good" next = student handled the step well; "bad" next = student struggled or needs a detour. Both must point to EXISTING node ids.
- The story must stay realistic and specific to THIS scenario, with concrete mini-events (a price is wrong, a form is missing, a question surprises the student…).
- German difficulty stays at ${sc.level}; situations are written in simple English.`;

  const data = await callGroq(prompt, 2500);
  const content = data?.choices?.[0]?.message?.content ?? "";
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    const nodes = obj?.nodes;
    const problem = validate(nodes);
    if (problem) { console.log(`    invalid graph (${problem})`); return null; }
    return nodes;
  } catch { return null; }
}

async function main() {
  const scenarios = extractScenarios().filter((s) => !ONLY || ONLY.has(s.id));
  console.log(`Found ${scenarios.length} scenarios in src/lib/scenarios.ts`);

  let branches = {};
  if (fs.existsSync(OUT_FILE) && !FORCE) {
    const prev = fs.readFileSync(OUT_FILE, "utf-8");
    try {
      branches = JSON.parse(prev.match(/=\s*(\{[\s\S]*\});?\s*$/)?.[1] ?? "{}");
    } catch { branches = {}; }
  }

  let done = 0;
  for (const sc of scenarios) {
    if (branches[sc.id] && !FORCE) { done++; continue; }
    if (ONLY && !ONLY.has(sc.id)) continue;
    process.stdout.write(`→ ${sc.id} (${sc.level}) … `);
    const nodes = await genGraph(sc);
    if (nodes) {
      branches[sc.id] = nodes;
      done++;
      console.log(`✓ ${nodes.length} nodes`);
      // write after every success (resumable)
      const header = `// AUTO-GENERATED by scripts/generate-branches.mjs — do not edit by hand.
// Branching story graphs for role-play scenarios. Re-generate: npm run gen:branches
import type { BranchNode } from "./scenarios";

export const BRANCHES: Record<string, BranchNode[]> = `;
      fs.writeFileSync(OUT_FILE, header + JSON.stringify(branches, null, 2) + ";\n");
    } else {
      console.log("✗ failed, will retry on next run");
    }
    await sleep(2500);
  }

  console.log(`\n🎉 ${done}/${scenarios.length} scenarios have branch graphs → src/lib/branches.generated.ts`);
}

main();
