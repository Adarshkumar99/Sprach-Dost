#!/usr/bin/env node
/**
 * Grammar lesson generator — creates German grammar topics (Goethe syllabus
 * A1/A2/B1) through the free Groq API and saves JSON packs to
 * public/grammar/<LEVEL>.json.
 *
 * Each topic: { id, title, lesson, questions[12] } with MCQ + explanation.
 * Target: ~30 topics/level → 300–360+ questions per level.
 *
 * Usage:
 *   1. GROQ_API_KEY=gsk_... in .env.local
 *   2. node scripts/generate-grammar.mjs         → all levels
 *      ONLY_LEVEL=A1 node scripts/generate-grammar.mjs  (one level)
 * Safe to re-run — resumes per topic, never regenerates completed ones.
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

/* Goethe-aligned syllabus */
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
    ["personal-pronouns-acc-dat", "Personal Pronouns in Accusative & Dative (mich, mir, dich, dir…)"],
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
    ["wechselpraepositionen", "Two-way Prepositions: Akkusativ or Dativ (in die Schule / in der Schule)"],
    ["praeteritum-sein-haben", "Präteritum: sein & haben (war, hatte)"],
    ["praeteritum-modals", "Präteritum of Modal Verbs (musste, konnte, wollte…)"],
    ["perfekt-vs-praeteritum", "Perfekt vs Präteritum: when to use which"],
    ["weil-clauses", "Subordinate Clauses with weil"],
    ["dass-clauses", "Subordinate Clauses with dass"],
    ["wenn-als", "wenn vs als (time clauses)"],
    ["ob-indirect-questions", "Indirect Questions with ob & W-words"],
    ["relative-clauses", "Relative Clauses (Nominativ & Akkusativ)"],
    ["comparative", "Comparative & Superlative (größer, am größten)"],
    ["adjective-declension-def", "Adjective Declension after definite article (der gute Film)"],
    ["adjective-declension-indef", "Adjective Declension after ein & without article"],
    ["reflexive-akusativ-dativ", "Reflexive Verbs: Akkusativ vs Dativ (sich waschen / sich die Hände waschen)"],
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
    ["passiv-praesens", "Passiv: Präsens (Das Auto wird repariert)"],
    ["passiv-praeteritum", "Passiv: Präteritum & Perfekt"],
    ["passiv-modals", "Passiv with Modal Verbs (muss gemacht werden)"],
    ["konjunktiv2-wishes", "Konjunktiv II: Wishes (ich hätte gern, wäre schön)"],
    ["konjunktiv2-advice", "Konjunktiv II: Advice & polite requests (solltest, könntest du…)"],
    ["konjunktiv2-unreal", "Konjunktiv II: Unreal conditions (Wenn ich Zeit hätte…)"],
    ["konjunktiv1-intro", "Konjunktiv I intro: reported speech (er sagte, er sei krank)"],
    ["relative-clauses-all", "Relative Clauses: all cases + prepositions (mit dem, für die…)"],
    ["infinitive-um-ohne", "Infinitive Clauses: um…zu, ohne…zu, (an)statt…zu"],
    ["obwohl-clauses", "Concessive Clauses (obwohl)"],
    ["damit-clauses", "Purpose Clauses (damit, um…zu)"],
    ["temporal-clauses", "Temporal Clauses (bevor, während, seitdem, nachdem)"],
    ["konditionalsaetze", "Conditional Clauses (wenn, falls)"],
    ["n-declension", "N-Deklination (der Student → den Studenten)"],
    ["adjectives-as-nouns", "Adjectives as Nouns (der Deutsche, etwas Neues)"],
    ["double-conjunctions", "Double Conjunctions (entweder…oder, je…desto, weder…noch)"],
    ["pronominaladverbs", "Pronominal Adverbs (darauf, womit, davon)"],
    ["verbs-prepositions-b1", "Verbs with Prepositions: B1 set (bestehen aus, sich kümmern um)"],
    ["indirect-questions-b1", "Indirect Questions in all tenses"],
    ["participles-as-adjectives", "Participles as Adjectives (die laufende Frau, das gekaufte Brot)"],
    ["lassen-b1", "lassen: all meanings at B1"],
    ["brauchen-zu", "brauchen + zu / brauchen nicht"],
    ["modal-verbs-subjective", "Modal Verbs: subjective meaning (das dürfte stimmen, er muss krank sein)"],
    ["position-of-nicht", "Position of nicht in the sentence"],
    ["word-order-emphasis", "Word Order for emphasis (object first, Mittelfeld)"],
    ["passiv-alternatives", "Alternatives to Passiv (man, sich lassen, -bar adjectives)"],
    ["b1-mixed-review", "B1 Mixed Grammar Review (all topics)"],
  ],
};

const QUESTIONS_PER_TOPIC = 12;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function askGroq(level, topicId, topicTitle) {
  const prompt = `Create a German grammar lesson for CEFR level ${level}, topic: "${topicTitle}".

Return ONLY a valid JSON object (no markdown) with exactly this shape:
{
  "lesson": "string — the lesson text. Explain the rule in SIMPLE English (the learners are Indian students). Include: the rule, a small conjugation/declension table as plain text lines, 4-6 short German example sentences each followed by its English translation. Use line breaks (\\n). Keep it under 300 words total, crisp and correct.",
  "questions": [
    {
      "q": "German fill-in-the-blank or choose-the-correct-form sentence, e.g. 'Ich ___ gestern ins Kino gegangen. (sein)' — must test THIS topic at level ${level}",
      "options": ["4 answer options as short German strings"],
      "answer": 0,
      "why": "one sentence explaining WHY the answer is correct (simple English)"
    }
  ]
}

Rules:
- Exactly ${QUESTIONS_PER_TOPIC} questions. "answer" is the 0-based index of the correct option; shuffle its position between questions.
- German must be 100% correct (articles, endings, word order). Sentences short and natural.
- No question may require something beyond level ${level}.
- Return ONLY the JSON object.`;

  for (const model of MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.6,
          max_completion_tokens: 4500,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        const wait = txt.match(/try again in ([\d.]+)s/i);
        console.log(`    [${model}] ${res.status}${wait ? ` — waiting ${Math.ceil(Number(wait[1]))}s` : ""}: ${txt.slice(0, 100)}`);
        if (res.status === 429 && wait) await sleep(Math.ceil(Number(wait[1])) * 1000 + 500);
        continue;
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? "";
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) continue;
      const obj = JSON.parse(match[0]);
      if (
        obj && typeof obj.lesson === "string" && obj.lesson.length > 200 &&
        Array.isArray(obj.questions) && obj.questions.length >= 8 &&
        obj.questions.every((x) => x.q && Array.isArray(x.options) && x.options.length === 4 &&
          Number.isInteger(x.answer) && x.answer >= 0 && x.answer < 4)
      ) {
        return { id: topicId, title: topicTitle, lesson: obj.lesson, questions: obj.questions };
      }
      console.log(`    [${model}] output failed validation — trying next model`);
    } catch (e) {
      console.log(`    [${model}] error: ${String(e).slice(0, 100)}`);
    }
  }
  return null;
}

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
    const existingIds = new Map(existing.map((t) => [t.id, t]));
    const topics = TOPICS[level];
    console.log(`\n=== ${level}: have ${existingIds.size}/${topics.length} topics ===`);

    for (const [id, title] of topics) {
      if (existingIds.has(id)) continue;
      process.stdout.write(`  → ${title} … `);
      const topic = await askGroq(level, id, title);
      if (!topic) { console.log("(failed, will retry next run)"); await sleep(1500); continue; }
      existingIds.set(id, topic);
      // keep original syllabus order
      const ordered = topics.map(([tid]) => existingIds.get(tid)).filter(Boolean);
      fs.writeFileSync(file, JSON.stringify(ordered));
      console.log(`✓ ${topic.questions.length} questions (${existingIds.size}/${topics.length})`);
      await sleep(1500);
    }

    const total = [...existingIds.values()].reduce((n, t) => n + t.questions.length, 0);
    console.log(`${existingIds.size === topics.length ? "✅" : "⏸️"} ${level}: ${existingIds.size} topics, ${total} questions → public/grammar/${level}.json`);
  }
  console.log("\n🎉 Grammar packs done (re-run anytime to retry missing topics).");
}

main();
