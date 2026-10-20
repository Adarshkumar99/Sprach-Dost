#!/usr/bin/env node
/**
 * Story generator — creates short level-appropriate German stories with
 * per-paragraph English, per-story vocab, and comprehension MCQs.
 * Output: public/stories/<LEVEL>.json
 *
 * Safe to re-run — resumes, never regenerates completed stories.
 *
 * Usage:
 *   GROQ_API_KEY in .env.local
 *   node scripts/generate-stories.mjs           → 100 stories/level
 *   TARGET_A1=20 node ...                       → smaller test
 *   ONLY_LEVEL=A1 node ...                      → one level
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
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
].filter(Boolean);

const THEMES = [
  "a café visit in Berlin", "first day at German class", "buying groceries at the market",
  "missing the train", "a phone call to a German friend", "moving into a shared flat (WG)",
  "a weekend trip to Munich", "Diwali celebration with German friends", "a job interview",
  "getting lost in Hamburg", "cooking Dal and teaching a flatmate", "a rainy day and a library",
  "making a doctor's appointment", "a football match in the park", "birthday party surprise",
  "buying a SIM card", "a bicycle repair", "Sunday market stroll", "a small adventure in the Alps",
  "a kind stranger on the U-Bahn", "a library study day", "Christmas market visit",
  "a language exchange evening", "a video call home to India", "learning to ride the tram",
  "a cooking mishap and a neighbour's help",
];

const TARGETS = {
  A1: Number(process.env.TARGET_A1 ?? 100),
  A2: Number(process.env.TARGET_A2 ?? 100),
  B1: Number(process.env.TARGET_B1 ?? 100),
  B2: Number(process.env.TARGET_B2 ?? 100),
  C1: Number(process.env.TARGET_C1 ?? 100),
};
// B2/C1 stories are long (25-30 paragraphs) → one story per API call
const BATCH = 4;
const longStory = (level) => level === "B2" || level === "C1";
const batchSize = (level) => (longStory(level) ? 1 : BATCH);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const deadToday = new Set();

async function callGroq(prompt, maxTokens) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    if (deadToday.has(model)) continue;
    if (deadToday.size >= MODELS.length) return null;
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model, temperature: 0.8, max_completion_tokens: maxTokens,
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
        console.log(`    [${model}] ${res.status}: ${txt.slice(0, 100)}`);
        await sleep(1500);
        continue;
      }
      return await res.json();
    } catch (e) {
      console.log(`    [${model}] error: ${String(e).slice(0, 100)}`);
      await sleep(2000);
    }
  }
  return null;
}

async function genBatch(level, theme, existingTitles) {
  const pLevel = {
    A1: "short very simple sentences, A1 vocabulary only",
    A2: "simple past and present, A2 vocabulary",
    B1: "connected narrative, B1 vocabulary with opinion words",
    B2: "nuanced narrative with subordinate clauses, B2 vocabulary, opinions & indirect speech",
    C1: "sophisticated narrative, C1 vocabulary, idiomatic expressions, complex sentence structure",
  }[level];
  const sample = [...existingTitles].slice(-8).join(", ") || "(none)";
  const n = batchSize(level);
  const paraSpec = longStory(level)
    ? `"paragraphs": [
    {"de": "1-2 sentences of German", "en": "English translation"}
  ],   // EXACTLY 25-30 paragraphs — a long, complete story with scenes, dialogue and development`
    : `"paragraphs": [
    {"de": "1-3 sentences of German", "en": "English translation"}
  ],   // 6-10 paragraphs — story should feel complete, about 12-18 lines total`;
  const minParas = longStory(level) ? 22 : 5;
  const prompt = `Write ${n} short German stor${n === 1 ? "y" : "ies"} for CEFR level ${level}, theme: "${theme}" (${pLevel}).

Each story object must be:
{
  "id": "kebab-case-slug",
  "title": "short German title",
  ${paraSpec}
  "vocab": [
    {"de": "word with article if noun", "en": "meaning"}
  ],   // 8-12 key words actually used in the story
  "questions": [
    {
      "q": "Comprehension question about THIS story in simple German (or English ok at A1)",
      "options": ["4 short answers"],
      "answer": 0,                // 0-based correct index, shuffled positions
      "why": "one-sentence explanation in simple English"
    }
  ]   // exactly 5
}

Rules:
- German 100% correct and natural for level ${level}.
- Stories should feel warm and real — everyday texture (chai, trains, rain, WhatsApp calls home, Goethe-Institut, Sachertorte) mixed with a touch of fun.
${longStory(level) ? "- THIS IS A LONG STORY: it MUST have 25-30 paragraphs. Give it a real arc: setup → complication → turning point → resolution.\n" : ""}- Titles must not repeat these already used: ${sample}
- Return ONLY a valid JSON array of ${n} story object${n === 1 ? "" : "s"}.`;

  const data = await callGroq(prompt, longStory(level) ? 9000 : 5500);
  const content = data?.choices?.[0]?.message?.content ?? "";
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.filter((s) =>
      s && typeof s.id === "string" && typeof s.title === "string" &&
      Array.isArray(s.paragraphs) && s.paragraphs.length >= minParas &&
      Array.isArray(s.vocab) && s.vocab.length >= 6 &&
      Array.isArray(s.questions) && s.questions.length === 5 &&
      s.questions.every((q) => q.q && Array.isArray(q.options) && q.options.length === 4 &&
        Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4)
    );
  } catch { return null; }
}

async function main() {
  const outDir = path.join(ROOT, "public", "stories");
  fs.mkdirSync(outDir, { recursive: true });

  const only = process.env.ONLY_LEVEL;
  const levels = ["A1", "A2", "B1", "B2", "C1"].filter((l) => !only || l === only);

  for (const level of levels) {
    const file = path.join(outDir, `${level}.json`);
    let stories = [];
    if (fs.existsSync(file)) {
      try { stories = JSON.parse(fs.readFileSync(file, "utf-8")); } catch { stories = []; }
    }
    const target = TARGETS[level];
    const titles = new Set(stories.map((s) => s.id));
    console.log(`\n=== ${level}: have ${stories.length}/${target} stories ===`);

    let guard = 0;
    let themeIdx = 0;
    while (stories.length < target && guard < Math.max(60, target * 2)) {
      guard++;
      const theme = THEMES[themeIdx % THEMES.length];
      themeIdx++;
      process.stdout.write(`  → ${theme} … `);
      const batch = await genBatch(level, theme, titles);
      if (!batch) { console.log("(batch failed)"); await sleep(2000); continue; }
      let added = 0;
      for (const s of batch) {
        if (titles.has(s.id)) continue;
        titles.add(s.id);
        stories.push({ ...s, level });
        added++;
      }
      fs.writeFileSync(file, JSON.stringify(stories));
      console.log(`+${added} → ${stories.length}/${target}`);
      await sleep(4000);
    }
    console.log(`${stories.length >= target ? "✅" : "⏸️"} ${level}: ${stories.length} stories → public/stories/${level}.json`);
  }
  console.log("\n🎉 Story generation pass complete (re-run anytime to top up).");
}

main();
