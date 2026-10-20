#!/usr/bin/env node
/**
 * Vocabulary generator — batches German vocab (per level/topic) through the
 * free Groq API and saves clean JSON packs to public/vocab/<LEVEL>.json.
 *
 * Usage:
 *   1. Put GROQ_API_KEY=gsk_... in .env.local
 *   2. node scripts/generate-vocab.mjs            → full target counts
 *      TARGET_A1=200 node scripts/generate-vocab.mjs  → smaller test run
 *
 * Defaults: A1=1000, A2=1500, B1=2000 words (de, en, ex, exEn each).
 * Safe to re-run — it resumes and never duplicates existing words.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// load .env.local manually (no deps)
try {
  const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* fall through */ }

const KEY = process.env.GROQ_API_KEY;
if (!KEY) {
  console.error("❌ GROQ_API_KEY missing. Add it to .env.local first.");
  process.exit(1);
}

// Ordered by efficiency: qwen is clean & cheap on the free tier,
// gpt-oss models are highest quality but daily-token-limited and waste
// tokens on hidden reasoning — gpt-oss-120b is tried first when its daily
// budget has reset (best German quality).
const MODELS = [
  process.env.GROQ_MODEL,
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
].filter(Boolean);

const TARGETS = {
  A1: Number(process.env.TARGET_A1 ?? 1000),
  A2: Number(process.env.TARGET_A2 ?? 1500),
  B1: Number(process.env.TARGET_B1 ?? 2000),
  B2: Number(process.env.TARGET_B2 ?? 1500),
  C1: Number(process.env.TARGET_C1 ?? 1500),
};

/* cross-level dedupe: no German word may repeat across ANY level (incl. the TS seed).
   normalized key: lowercase, strip leading article, punctuation-free */
const LEVEL_FILES = ["A1", "A2", "B1", "B2", "C1"];
function normKey(de) {
  return String(de)
    .toLowerCase()
    .replace(/^(der|die|das|ein|eine|einen|einem|einer|eines)\s+/, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
function extractSeedWords(seedFile) {
  const out = new Set();
  try {
    const src = fs.readFileSync(seedFile, "utf-8");
    for (const m of src.matchAll(/w\("([^"]+)"/g)) out.add(normKey(m[1]));
  } catch { /* no seed file */ }
  return out;
}

// fine-grained topic lists (generator cycles through until target reached)
const TOPICS = {
  A1: [
    "greetings & politeness", "numbers, dates & time", "days months seasons", "family & relationships",
    "body parts", "feelings & basic emotions", "food & drinks", "restaurant & café", "breakfast & meals",
    "clothing & colours", "house & rooms", "furniture & home items", "animals & pets",
    "school & classroom", "jobs & professions", "city places & buildings", "transport & travel basics",
    "directions & locations", "shopping & money", "weather & nature", "hobbies & free time",
    "sports & games", "daily routine verbs", "common adjectives (big small fast slow...)",
    "communication (phone letter email)", "health & doctor basics", "countries & languages",
    "question words & connectors", "common verbs (sein haben werden gehen kommen)",
    "common nouns with articles (mixed daily life)", "kitchen & cooking", "bathroom & hygiene",
    "music & entertainment", "computers & internet basics", "pocket money & prices",
  ],
  A2: [
    "travel & holidays", "hotel & accommodation", "airport & flights", "train travel & stations",
    "driving & car", "work & office", "job applications & interviews", "meetings & colleagues",
    "university & courses", "health appointments & insurance", "pharmacy & medicine",
    "bank & accounts", "post & parcels", "phone calls & messages", "invitations & events",
    "opinions & feelings", "comparisons & preferences", "past events & stories (Perfekt vocab)",
    "wishes & plans (future)", "housework & chores", "neighbourhood & rent", "celebrations & gifts",
    "media & TV", "internet & social media", "environment & weather events", "countries & cultures",
    "sports & fitness training", "fashion & style", "cooking recipes & ingredients",
    "emergencies & help", "officials & paperwork (Amt)", "repair & handyman words",
  ],
  B1: [
    "education system & exams", "work culture & contracts", "economy & money matters",
    "politics & society basics", "environment & climate", "technology & digital life",
    "psychology & relationships", "literature & arts", "film & theatre", "news & journalism",
    "law & rights basics", "healthcare system", "nutrition & lifestyle", "mobility & cities",
    "history & memory culture", "science & research vocabulary", "debating & arguing phrases",
    "hypotheses & assumptions", "idioms & colloquial expressions", "workplace conflicts",
    "volunteering & community", "migration & integration topics", "study skills & learning strategies",
    "presentation & discussion vocabulary", "report & summary language", "apartment hunting depth",
    "taxes & finance personal", "cooking specialties & regional food", "German festivals & traditions",
    "customer complaints & solutions",
  ],
  B2: [
    "work & career development", "business & economics", "politics & elections", "society & social issues",
    "media & journalism depth", "advertising & marketing", "environment & sustainability", "energy & climate policy",
    "law & contracts", "crime & justice", "immigration & integration", "education & university life depth",
    "science & technology", "research & innovation", "medicine & healthcare depth", "psychology & personality",
    "relationships & communication", "urban life & infrastructure", "rural life & agriculture", "mobility & transport policy",
    "culture & cultural differences", "art & architecture", "music & concert culture", "literature & reading habits",
    "history & historical events", "sports & professional sport", "hobbies & creative pursuits", "travel & cultural exchange",
    "food culture & nutrition debates", "fashion & consumerism", "digital privacy & internet", "artificial intelligence & future",
    "volunteering & NGOs", "finance & investment", "insurance & paperwork", "meetings & presentations depth",
    "negotiations & conflict resolution", "applications & assessment centres", "leadership & teamwork", "stress & work-life balance",
  ],
  C1: [
    "abstract concepts & ideas", "argumentation & rhetoric", "academic writing & essays", "science & methodology",
    "statistics & data interpretation", "philosophy & ethics", "psychology & cognition depth", "sociology & social change",
    "economics & global markets", "globalisation & trade", "diplomacy & international relations", "eu & european politics",
    "media ethics & press freedom", "digitalisation & society", "climate science & debates", "bioethics & genetics",
    "urban planning & architecture depth", "literary analysis & style", "film & aesthetics", "linguistics & language change",
    "idioms & fixed expressions", "colloquial speech & register shifts", "formal register & officialese", "humour & irony",
    "proverbs & sayings", "emotion vocabulary depth", "character traits & nuances", "motivation & self-management",
    "leadership & strategy language", "consulting & analysis language", "negotiation subtleties", "cross-cultural communication",
    "history & historiography", "memory & remembrance culture", "migration & identity", "values & norms",
  ],
};

const CHUNK = 40; // words per API call (keeps requests under free-tier TPM limits)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function askGroq(level, topic, avoidSample) {
  const prompt = `Generate exactly ${CHUNK} German vocabulary items for CEFR level ${level}, topic: "${topic}".

Rules:
- Each item: { "de": "German word/short phrase (articles for nouns, infinitive for verbs)", "en": "English meaning", "ex": "one SHORT natural German example sentence (level ${level})", "exEn": "English translation of the example" }
- No markdown, no numbering, return ONLY a valid JSON array of ${CHUNK} objects.
- Vary the items; do not repeat these if possible: ${avoidSample}.
- German must be correct and natural. Keep German examples plain text.`;

  for (const model of MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.8,
          max_completion_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        const wait = txt.match(/try again in ([\d.]+)s/i);
        console.log(`    [${model}] ${res.status}${wait ? ` — waiting ${Math.ceil(Number(wait[1]))}s` : ""}: ${txt.slice(0, 120)}`);
        if (res.status === 429 && wait) await sleep(Math.ceil(Number(wait[1])) * 1000 + 500);
        continue;
      }
      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      const content = msg?.content ?? "";
      const finish = data.choices?.[0]?.finish_reason;
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) {
        console.log(`    [${model}] unparseable output (finish=${finish}, len=${content.length})`);
        continue;
      }
      const arr = JSON.parse(match[0]);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch (e) {
      console.log(`    [${model}] error: ${String(e).slice(0, 120)}`);
    }
  }
  return null;
}

async function main() {
  const outDir = path.join(ROOT, "public", "vocab");
  fs.mkdirSync(outDir, { recursive: true });

  /* ── global cross-level registry (all 5 files + TS seed) ── */
  const globalSeen = extractSeedWords(path.join(ROOT, "src", "lib", "vocab.ts"));
  console.log(`seed words in registry: ${globalSeen.size}`);

  const files = {};
  const preCounts = {};
  for (const level of LEVEL_FILES) {
    const file = path.join(outDir, `${level}.json`);
    let existing = [];
    if (fs.existsSync(file)) {
      try { existing = JSON.parse(fs.readFileSync(file, "utf-8")); } catch { existing = []; }
    }
    preCounts[level] = existing.length;
    files[level] = existing;
  }

  /* DEDUPE=1 → retro-clean: keep each word in the LOWEST level, drop later duplicates */
  if (process.env.DEDUPE === "1") {
    console.log("\n🧹 retro-dedupe pass (keeping first occurrence per word)…");
    for (const level of LEVEL_FILES) {
      const before = files[level].length;
      files[level] = files[level].filter((w) => {
        const k = normKey(w.de);
        if (globalSeen.has(k)) return false;
        globalSeen.add(k);
        return true;
      });
      const removed = before - files[level].length;
      if (removed) {
        fs.writeFileSync(path.join(outDir, `${level}.json`), JSON.stringify(files[level], null, 0));
        console.log(`  ${level}: -${removed} duplicates (kept in a lower level)`);
      }
    }
  }

  /* register everything that survived */
  for (const level of LEVEL_FILES) {
    for (const w of files[level]) globalSeen.add(normKey(w.de));
  }

  for (const level of LEVEL_FILES) {
    const file = path.join(outDir, `${level}.json`);
    const existing = files[level];
    const seen = new Set(existing.map((w) => normKey(w.de)));
    const target = TARGETS[level];
    console.log(`\n=== ${level}: have ${existing.length}, target ${target} ===`);
    if (existing.length >= target) { console.log("done already ✅"); continue; }

    let ti = 0;
    let guard = 0;
    while (seen.size < target && guard < target * 2) {
      guard++;
      const topic = TOPICS[level][ti % TOPICS[level].length];
      ti++;
      const avoid = existing.slice(-40).map((w) => w.de).join(", ");
      process.stdout.write(`  → ${topic} … `);
      const items = await askGroq(level, topic, avoid);
      if (!items) { console.log("(model failed, skipping)"); await sleep(1500); continue; }

      let added = 0;
      for (const it of items) {
        const de = String(it.de ?? "").trim();
        const en = String(it.en ?? "").trim();
        if (!de || !en) continue;
        const k = normKey(de);
        if (globalSeen.has(k) || seen.has(k)) continue; // no repeats across ANY level
        globalSeen.add(k);
        seen.add(k);
        existing.push({
          de,
          en,
          ex: String(it.ex ?? "").trim() || undefined,
          exEn: String(it.exEn ?? "").trim() || undefined,
          level,
          topic,
        });
        added++;
      }
      fs.writeFileSync(file, JSON.stringify(existing, null, 0));
      console.log(`+${added} (total ${existing.length})`);
      await sleep(2500); // be kind to the free rate limit
    }
    console.log(`✅ ${level} complete: ${existing.length} words saved to public/vocab/${level}.json`);
  }
  console.log("\n🎉 All done — vocab packs are live in the app (they load automatically).");
}

main();
