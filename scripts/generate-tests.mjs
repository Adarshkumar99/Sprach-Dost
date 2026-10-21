#!/usr/bin/env node
/**
 * Test-series generator — full Goethe-style mock exams, 50 per level (A1–B2).
 * Each test = Lesen (text+MCQ) + Hören (TTS script+MCQ) + Schreiben (prompt) + Sprechen (3 tasks).
 * Output: public/tests/<LEVEL>.json
 *
 * Safe to re-run — resumes, never duplicates (dedupe on question/text hash).
 *
 * Usage:
 *   GROQ_API_KEY in .env.local
 *   node scripts/generate-tests.mjs            → 50 tests/level
 *   ONLY_LEVEL=A1 TARGET_TESTS=5 node ...      → smaller run
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
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
  
].filter(Boolean);

const LEVELS = ["A1", "A2", "B1", "B2"];
const TARGET_TESTS = Number(process.env.TARGET_TESTS ?? 50);
const ONLY = process.env.ONLY_LEVEL ? new Set(process.env.ONLY_LEVEL.split(",")) : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const deadToday = new Set();
const SPECS = {
  A1: `Lesen: 1-2 short everyday texts (notices, small ads, notes). 4 simple MCQs.
Hören: 1 short announcement/dialogue (5-8 sentences, spoken style). 4 simple MCQs.
Schreiben: short personal message/postcard task, ~30 words, 4 required points.
Sprechen: 3 tasks — 1) introduce yourself / answer simple personal questions, 2) ask or request something (words/numbers/picture), 3) express a wish or politely ask for something.`,
  A2: `Lesen: 1 short email/ad/notice. 5 MCQs.
Hören: 1 radio item, announcement or dialogue (8-12 sentences). 5 MCQs.
Schreiben: short email task, ~50 words, 4 required points (thanks/sorry/ask/invite).
Sprechen: 3 tasks — 1) talk about a past experience, 2) describe a problem + what to do, 3) plan something together (suggestions, times, costs).`,
  B1: `Lesen: 1 blog/forum/newspaper-style text (150-220 words). 5 MCQs.
Hören: 1 longer announcement, phone message or interview excerpt (10-15 sentences). 5 MCQs.
Schreiben: semi-formal email task (inquiry/complaint/application), ~80 words, 5 required points.
Sprechen: 3 tasks — 1) short personal presentation (25+ words), 2) themed talk with reasons, 3) planning/discussion with a partner (suggestions, opinions).`,
  B2: `Lesen: 1 demanding article/report/essay excerpt (200-300 words) with nuanced questions. 5-6 MCQs.
Hören: 1 interview excerpt, lecture segment or news report (15+ sentences). 5-6 MCQs.
Schreiben: formal email or forum post expressing/arguing a position, ~100 words, 5 required points.
Sprechen: 3 tasks — 1) structured presentation on a theme (30+ words), 2) discussion with pros & cons (einerseits/andererseits), 3) negotiation/role-play with a conflicting goal.`,
};

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
          model, temperature: 0.7, max_completion_tokens: 6500,
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

function qKey(q) {
  return crypto.createHash("sha1").update(String(q.q ?? "").toLowerCase().replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16);
}
function textKey(t) {
  return crypto.createHash("sha1").update(String(t ?? "").toLowerCase().replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16);
}

function validMcq(qs) {
  return Array.isArray(qs) && qs.length >= 4 && qs.length <= 6 &&
    qs.every((q) => q.q && Array.isArray(q.options) && q.options.length === 4 &&
      Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4 && q.options.every((o) => typeof o === "string" && o.trim()));
}

function validateTest(t) {
  if (!t || typeof t !== "object") return "root";
  if (!validMcq(t.lesen?.questions) || typeof t.lesen?.text !== "string" || t.lesen.text.length < 80) return "lesen";
  if (!validMcq(t.horen?.questions) || typeof t.horen?.scriptDe !== "string" || t.horen.scriptDe.length < 60) return "horen";
  const sc = t.schreiben;
  if (!sc || typeof sc.promptDe !== "string" || sc.promptDe.length < 30 ||
      typeof sc.promptEn !== "string" || !Number.isFinite(Number(sc.wordTarget)) ||
      !Array.isArray(sc.bullets) || sc.bullets.length < 3) return "schreiben";
  const sp = t.sprechen?.tasks;
  if (!Array.isArray(sp) || sp.length < 2 || sp.length > 4) return "sprechen-tasks";
  for (const task of sp) {
    if (!task.promptDe || !task.instructionsEn || !Array.isArray(task.keywords) || task.keywords.length < 3 ||
        !Number.isFinite(Number(task.minWords))) return "sprechen-fields";
  }
  return null;
}

async function genTest(level, idx, seenTexts, seenQs) {
  const avoidTexts = [...seenTexts].slice(-6).map((t) => `"${t.slice(0, 50)}…"`).join(", ") || "(none)";
  const prompt = `Create ONE complete Goethe-style German mock exam for CEFR level ${level} (Modelltest ${idx}).

Format spec:
${SPECS[level]}

Return ONLY valid JSON (no markdown), exactly this shape:
{
  "lesen": { "title": "Lesen — <2-4 word German topic>", "text": "<the reading text>", "questions": [{"q":"...","options":["a","b","c","d"],"answer":0,"why":"1 line why"}] },
  "horen": { "title": "Hören — <2-4 word German topic>", "scriptDe": "<the FULL spoken text that will be read aloud>", "questions": [{"q":"...","options":["a","b","c","d"],"answer":0,"why":"1 line why"}] },
  "schreiben": { "title": "Schreiben — <short>", "promptDe": "<task in German>", "promptEn": "<same task in English>", "wordTarget": <number>, "bullets": ["required point", "..."] },
  "sprechen": { "tasks": [ { "id": "sp1", "title": "Teil 1 — <name>", "instructionsEn": "<what to do>", "promptDe": "<examiner line to be read aloud>", "keywords": ["5-8 German keywords we listen for"], "minWords": <number> }, ... ] }
}

Rules:
- German 100% correct, natural, strictly level ${level}. Content realistic and varied (everyday life, work, travel, society).
- "answer" = 0-based index of the correct option; vary its position.
- Hören questions must be answerable ONLY from the audio (scriptDe) — numbers, times, names, reasons.
- Lesen text and Hören script must be DIFFERENT topics. Avoid these recent topics: ${avoidTexts}
- Sprechen keywords are lowercase German words/phrases the student's spoken answer should contain.
- Return ONLY the JSON object.`;

  const data = await callGroq(prompt, 6500);
  const content = data?.choices?.[0]?.message?.content ?? "";
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const t = JSON.parse(match[0]);
    const problem = validateTest(t);
    if (problem) { console.log(`    invalid (${problem})`); return null; }
    // dedupe: no repeated reading text, audio script, or question
    if (seenTexts.has(textKey(t.lesen.text)) || seenTexts.has(textKey(t.horen.scriptDe))) { console.log("    duplicate topic"); return null; }
    const allQs = [...t.lesen.questions, ...t.horen.questions];
    if (allQs.some((q) => seenQs.has(qKey(q)))) { console.log("    duplicate question"); return null; }
    seenTexts.add(textKey(t.lesen.text));
    seenTexts.add(textKey(t.horen.scriptDe));
    for (const q of allQs) seenQs.add(qKey(q));
    // normalize sprechen ids
    t.sprechen.tasks.forEach((task, i) => { task.id = `sp${i + 1}`; });
    return t;
  } catch { return null; }
}

async function main() {
  const outDir = path.join(ROOT, "public", "tests");
  fs.mkdirSync(outDir, { recursive: true });

  for (const level of LEVELS) {
    if (ONLY && !ONLY.has(level)) continue;
    const file = path.join(outDir, `${level}.json`);
    let tests = [];
    if (fs.existsSync(file)) {
      try { tests = JSON.parse(fs.readFileSync(file, "utf-8")); } catch { tests = []; }
    }

    const seenTexts = new Set();
    const seenQs = new Set();
    for (const t of tests) {
      if (t.lesen?.text) seenTexts.add(textKey(t.lesen.text));
      if (t.horen?.scriptDe) seenTexts.add(textKey(t.horen.scriptDe));
      for (const q of [...(t.lesen?.questions ?? []), ...(t.horen?.questions ?? [])]) seenQs.add(qKey(q));
    }

    console.log(`\n=== ${level}: have ${tests.length}/${TARGET_TESTS} tests ===`);

    let guard = 0;
    while (tests.length < TARGET_TESTS && guard < TARGET_TESTS * 3) {
      guard++;
      const idx = tests.length + 1;
      process.stdout.write(`  → ${level} test ${idx} … `);
      const t = await genTest(level, idx, seenTexts, seenQs);
      if (!t) { console.log("✗ (will retry next run)"); await sleep(2000); continue; }
      tests.push({
        id: `${level.toLowerCase()}-t${String(idx).padStart(2, "0")}`,
        title: `Modelltest ${idx}`,
        lesen: t.lesen,
        horen: t.horen,
        schreiben: t.schreiben,
        sprechen: t.sprechen,
      });
      fs.writeFileSync(file, JSON.stringify(tests));
      console.log(`✓ (${tests.length}/${TARGET_TESTS})`);
      await sleep(3000);
    }
    console.log(`${tests.length >= TARGET_TESTS ? "✅" : "⏸️"} ${level}: ${tests.length} tests → public/tests/${level}.json`);
  }
  console.log("\n🎉 Test-series generation pass complete (re-run anytime to top up).");
}

main();
