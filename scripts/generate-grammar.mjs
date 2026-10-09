#!/usr/bin/env node
/**
 * Grammar content generator — creates German grammar lessons + question banks
 * (Goethe syllabus A1/A2/B1) through the free Groq API.
 *
 * Output: public/grammar/<LEVEL>.json
 *   [ { id, title, lesson, questions: [{q, options, answer, why}, ...] } ]
 *
 * Questions are generated in BATCHES of 20 (token-safe), accumulated per topic,
 * deduped, and saved incrementally after every batch. Safe to re-run anytime:
 * it resumes from where it stopped, topping up topics that are short.
 *
 * Usage:
 *   1. GROQ_API_KEY=gsk_... in .env.local
 *   2. node scripts/generate-grammar.mjs            → target 300 questions/topic
 *      TARGET_QUESTIONS=50 node ...               → smaller target
 *      ONLY_LEVEL=A2 node ...                     → one level only
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

/* load .env.local */
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

const MODELS = [
  process.env.GROQ_MODEL,
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
].filter(Boolean);

/* ── Goethe syllabus ── */
const TOPICS = {
  A1: [
    ["verb-conjugation", "Verb Conjugation (Present, regular verbs)"],
    ["sein-haben", "sein & haben"],
    ["personal-pronouns", "Personal Pronouns (ich, du, er/sie/es…)"],
    ["definite-articles", "Definite Articles der / die / das"],
    ["indefinite-articles", "Indefinite Articles ein / eine"],
    ["negation", "Negation: nicht & kein"],
    ["noun-plurals", "Plural of Nouns"],
    ["modal-verbs", "Modal Verbs (können, müssen, wollen, dürfen, sollen, mögen)"],
    ["separable-verbs", "Separable Verbs (aufstehen, einkaufen…)"],
    ["imperative", "Imperative (Geh! / Gehen Sie!)"],
    ["questions", "Questions: W-questions & Ja/Nein questions"],
    ["word-order", "Word Order: verb in second position"],
    ["nominative", "Nominative Case"],
    ["accusative", "Accusative Case"],
    ["possessives", "Possessive Articles (mein, dein, sein, ihr…)"],
    ["personal-pronouns-acc-dat", "Personal Pronouns in Accusative & Dative"],
    ["prepositions-place", "Local Prepositions (in, auf, an, neben, über, unter, vor, hinter)"],
    ["prepositions-time", "Time Prepositions (am, um, im, von…bis)"],
    ["numbers-ordinals", "Numbers & Ordinal Numbers"],
    ["time-expressions", "Telling the Time (Uhrzeit)"],
    ["irregular-verbs-present", "Irregular Verbs in Present (essen, fahren, lesen…)"],
    ["perfekt-haben", "Perfekt with haben"],
    ["perfekt-sein", "Perfekt with sein"],
    ["conjunctions", "Conjunctions: und, aber, oder, denn"],
    ["weil-clauses", "weil-Clauses (verb at the end)"],
    ["reflexive-verbs", "Reflexive Verbs (sich freuen, sich waschen)"],
    ["adjectives-basics", "Adjectives: predicative & basic attributive use"],
    ["gern-comparison", "gern / lieber / am liebsten"],
    ["es-gibt", "es gibt + Accusative"],
    ["polite-requests", "Polite Requests (Ich hätte gern…, Könnten Sie…)"],
  ],
  A2: [
    ["dative-articles", "Dative Case: Articles (der→dem, die→der, das→dem)"],
    ["dative-verbs", "Verbs with Dative (helfen, danken, gefallen…)"],
    ["dative-prepositions", "Dative Prepositions (mit, bei, nach, zu, von, aus, seit)"],
    ["wechselpraepositionen", "Two-way Prepositions: Akkusativ or Dativ"],
    ["praeteritum-sein-haben", "Präteritum: sein & haben (war, hatte)"],
    ["praeteritum-modals", "Präteritum of Modal Verbs (musste, konnte, wollte…)"],
    ["perfekt-vs-praeteritum", "Perfekt vs Präteritum: when to use which"],
    ["weil-clauses", "Subordinate Clauses with weil"],
    ["dass-clauses", "Subordinate Clauses with dass"],
    ["wenn-als", "wenn vs als (time clauses)"],
    ["ob-indirect-questions", "Indirect Questions with ob & W-words"],
    ["relative-clauses", "Relative Clauses (Nominativ & Akkusativ)"],
    ["comparative", "Comparative & Superlative (größer, am größten)"],
    ["adjective-declension-def", "Adjective Declension after definite article"],
    ["adjective-declension-indef", "Adjective Declension after ein & without article"],
    ["reflexive-akusativ-dativ", "Reflexive Verbs: Akkusativ vs Dativ"],
    ["verbs-with-prepositions", "Verbs with Fixed Prepositions (warten auf, sich freuen über/auf)"],
    ["future-werden", "Future with werden"],
    ["temporal-prepositions", "Temporal Prepositions (seit, vor, nach, bis, während)"],
    ["genitive-intro", "Genitive Introduction (das Auto meines Vaters)"],
    ["indefinite-pronouns", "Indefinite Pronouns (man, jemand, niemand, etwas, nichts)"],
    ["conjunctions-adverbial", "Conjunctions: deshalb, trotzdem, sonst, davor"],
    ["demonstratives", "Demonstratives: dieser, diese, dieses"],
    ["imperative-all", "Imperative: all forms (du / ihr / Sie)"],
    ["possessives-cases", "Possessive Articles in all cases"],
    ["question-prepositions", "Questions with prepositions (worauf? mit wem?)"],
    ["als-wie-comparison", "Comparisons with als & wie"],
    ["n-clauses-intro", "Double conjunctions intro: sowohl…als auch, nicht nur…sondern auch"],
    ["word-order-nebensatz", "Word Order in Subordinate Clauses (review & drill)"],
    ["lassen", "The Verb lassen (leave / let / have something done)"],
  ],
  B1: [
    ["genitive", "Genitive Case (full declension)"],
    ["plusquamperfekt", "Plusquamperfekt (past perfect)"],
    ["futur-1-2", "Futur I & Futur II"],
    ["passiv-praesens", "Passiv: Präsens"],
    ["passiv-praeteritum", "Passiv: Präteritum & Perfekt"],
    ["passiv-modals", "Passiv with Modal Verbs"],
    ["konjunktiv2-wishes", "Konjunktiv II: Wishes"],
    ["konjunktiv2-advice", "Konjunktiv II: Advice & polite requests"],
    ["konjunktiv2-unreal", "Konjunktiv II: Unreal conditions"],
    ["konjunktiv1-intro", "Konjunktiv I intro: reported speech"],
    ["relative-clauses-all", "Relative Clauses: all cases + prepositions"],
    ["infinitive-um-ohne", "Infinitive Clauses: um…zu, ohne…zu, (an)statt…zu"],
    ["obwohl-clauses", "Concessive Clauses (obwohl)"],
    ["damit-clauses", "Purpose Clauses (damit, um…zu)"],
    ["temporal-clauses", "Temporal Clauses (bevor, während, seitdem, nachdem)"],
    ["konditionalsaetze", "Conditional Clauses (wenn, falls)"],
    ["n-declension", "N-Deklination"],
    ["adjectives-as-nouns", "Adjectives as Nouns"],
    ["double-conjunctions", "Double Conjunctions (entweder…oder, je…desto, weder…noch)"],
    ["pronominaladverbs", "Pronominal Adverbs (darauf, womit, davon)"],
    ["verbs-prepositions-b1", "Verbs with Prepositions: B1 set"],
    ["indirect-questions-b1", "Indirect Questions in all tenses"],
    ["participles-as-adjectives", "Participles as Adjectives"],
    ["lassen-b1", "lassen: all meanings at B1"],
    ["brauchen-zu", "brauchen + zu / brauchen nicht"],
    ["modal-verbs-subjective", "Modal Verbs: subjective meaning"],
    ["position-of-nicht", "Position of nicht in the sentence"],
    ["word-order-emphasis", "Word Order for emphasis"],
    ["passiv-alternatives", "Alternatives to Passiv (man, sich lassen, -bar adjectives)"],
    ["b1-mixed-review", "B1 Mixed Grammar Review (all topics)"],
  ],
};

const TARGET_QUESTIONS = Number(process.env.TARGET_QUESTIONS ?? 300);
const BATCH = 20; // questions per API call (token-safe)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── dedupe helpers ── */
function qKey(q) {
  return String(q ?? "").toLowerCase().replace(/[^a-zäöüß0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/* ── Groq call with model fallback + rate-limit awareness ── */
const deadToday = new Set(); // models whose DAILY budget is exhausted

async function callGroq(prompt, maxTokens) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    if (deadToday.has(model)) continue;
    if ([...deadToday].length >= MODELS.length) return null; // all daily budgets gone

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          max_completion_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 429) {
          if (/tokens per day/i.test(txt)) {
            console.log(`    [${model}] daily budget exhausted — skipping model`);
            deadToday.add(model);
            continue;
          }
          // per-minute limit: wait and retry
          const m = txt.match(/try again in ([\d.]+)s/i);
          const waitS = m ? Math.ceil(Number(m[1])) : 20;
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

/* ── lesson (generated once per topic) ── */
async function genLesson(level, topicTitle) {
  const prompt = `Create a German grammar lesson for CEFR level ${level}, topic: "${topicTitle}".

Return ONLY a valid JSON object (no markdown) with exactly this shape:
{
  "lesson": "string — the lesson text. Explain the rule in SIMPLE English (learners are absolute beginners). Include: the rule, a small conjugation/declension table as plain text lines, 4-6 short German example sentences each followed by its English translation. Use line breaks (\\n). Keep it under 300 words total, crisp and correct."
}`;
  const data = await callGroq(prompt, 2500);
  const content = data?.choices?.[0]?.message?.content ?? "";
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (obj && typeof obj.lesson === "string" && obj.lesson.length > 200) return obj.lesson;
  } catch { /* fall through */ }
  return null;
}

/* ── one batch of questions ── */
async function genQuestions(level, topicId, topicTitle, batchSize, existingKeys) {
  const sampleAvoid = [...existingKeys].slice(-10).map((k) => `"${k.slice(0, 50)}..."`).join(", ");
  const prompt = `Generate exactly ${batchSize} German grammar practice questions for CEFR level ${level}, topic: "${topicTitle}".

Return ONLY a valid JSON array (no markdown) of exactly ${batchSize} objects with this shape:
[
  {
    "q": "German fill-in-the-blank or choose-the-correct-form sentence, e.g. 'Ich ___ gestern ins Kino gegangen. (sein)' — must test THIS topic at level ${level}",
    "options": ["4 answer options as short German strings"],
    "answer": 0,
    "why": "one sentence explaining WHY the answer is correct (simple English)"
  }
]

Rules:
- "answer" is the 0-based index of the correct option; shuffle its position between questions.
- German must be 100% correct. Sentences short and natural.
- No question may require knowledge beyond level ${level}.
- Every question MUST be different from these recent ones: ${sampleAvoid || "(none)"}
- Return ONLY the JSON array.`;

  const data = await callGroq(prompt, 3200);
  const content = data?.choices?.[0]?.message?.content ?? "";
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const arr = JSON.parse(match[0]);
    if (Array.isArray(arr) && arr.length >= Math.floor(batchSize * 0.7)) {
      return arr.filter(
        (x) => x.q && Array.isArray(x.options) && x.options.length === 4 &&
          Number.isInteger(x.answer) && x.answer >= 0 && x.answer < 4
      );
    }
  } catch { /* fall through */ }
  return null;
}

/* ── main ── */
async function main() {
  const outDir = path.join(ROOT, "public", "grammar");
  fs.mkdirSync(outDir, { recursive: true });

  const only = process.env.ONLY_LEVEL;
  const levels = ["A1", "A2", "B1"].filter((l) => !only || l === only);

  for (const level of levels) {
    const file = path.join(outDir, `${level}.json`);
    let existing = [];
    if (fs.existsSync(file)) {
      try { existing = JSON.parse(fs.readFileSync(file, "utf-8")); } catch { existing = []; }
    }
    const byId = new Map(existing.map((t) => [t.id, t]));
    const topics = TOPICS[level];
    console.log(`\n=== ${level}: have ${byId.size}/${topics.length} topics, target ${TARGET_QUESTIONS} q/topic ===`);

    for (let i = 0; i < topics.length; i++) {
      const [id, title] = topics[i];
      const cur = byId.get(id);
      if (cur && cur.questions.length >= TARGET_QUESTIONS) continue;

      /* lesson: only if missing */
      let lesson = cur?.lesson;
      if (!lesson) {
        process.stdout.write(`  → ${title} … lesson `);
        lesson = await genLesson(level, title);
        if (!lesson) { console.log("(lesson failed, will retry)"); await sleep(1500); continue; }
        console.log("✓");
      }

      /* questions: top up to target in batches */
      const seen = new Set((cur?.questions ?? []).map((x) => qKey(x.q)));
      const questions = [...(cur?.questions ?? [])];
      let guard = 0;
      while (questions.length < TARGET_QUESTIONS && guard < 25) {
        guard++;
        process.stdout.write(`  → ${title} … ${questions.length}/${TARGET_QUESTIONS} `);
        const batch = await genQuestions(level, id, title, BATCH, seen);
        if (!batch) { console.log("(batch failed)"); await sleep(2000); continue; }
        let added = 0;
        for (const q of batch) {
          const k = qKey(q.q);
          if (seen.has(k)) continue;
          seen.add(k);
          questions.push(q);
          added++;
        }
        // persist after every batch (resume-safe)
        byId.set(id, { id, title, lesson, questions });
        const ordered = topics.map(([tid]) => byId.get(tid)).filter(Boolean);
        fs.writeFileSync(file, JSON.stringify(ordered));
        console.log(`+${added} → ${questions.length}/${TARGET_QUESTIONS}`);
        if (added === 0) break; // model ran out of fresh ideas for this topic
        await sleep(4000); // pace: stay under per-minute token limits
      }
      console.log(`  ${questions.length >= TARGET_QUESTIONS ? "✅" : "⏸️"} ${title}: ${questions.length} questions`);
    }

    const total = [...byId.values()].reduce((n, t) => n + t.questions.length, 0);
    console.log(`${[...byId.values()].every((t) => t.questions.length >= TARGET_QUESTIONS) ? "✅" : "⏸️"} ${level}: ${byId.size} topics, ${total} questions total → public/grammar/${level}.json`);
  }
  console.log("\n🎉 Grammar generation pass complete (re-run anytime to top up).");
}

main();
