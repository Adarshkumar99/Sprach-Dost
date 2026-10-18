/** Parse the marked avatar replies (GERMAN: / KORREKTUR: / ERKLARUNG: / HINT: / FEEDBACK sections) */

/** Strip markdown/AI artifacts so TTS never reads "asterisk asterisk" out loud */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold**
    .replace(/\*([^*]+)\*/g, "$1") // *italic*
    .replace(/__([^_]+)__/g, "$1") // __bold__
    .replace(/`([^`]*)`/g, "$1") // `code`
    .replace(/^#{1,6}\s*/gm, "") // # headings
    .replace(/\s{2,}/g, " ")
    .trim();
}

export type AvatarReply = {
  german: string;
  korrektur: string;
  erklarung: string;
  hint: string;
  raw: string;
};
export function parseReply(text: string): AvatarReply {
  const out: AvatarReply = { german: "", korrektur: "", erklarung: "", hint: "", raw: text };

  const patterns: { key: keyof AvatarReply; regexes: RegExp[] }[] = [
    { key: "german", regexes: [/^GERMAN:\s*/im] },
    { key: "korrektur", regexes: [/^KORREKTUR:\s*/im] },
    { key: "erklarung", regexes: [/^ERKL[AÄ]RUNG:\s*/im] },
    { key: "hint", regexes: [/^HINT:\s*/im] },
  ];

  // find positions of each marker
  const found: { key: keyof AvatarReply; start: number; end: number }[] = [];
  for (const p of patterns) {
    for (const r of p.regexes) {
      const m = text.match(r);
      if (m && m.index !== undefined) {
        found.push({ key: p.key, start: m.index, end: m.index + m[0].length });
        break;
      }
    }
  }

  if (found.length === 0) {
    out.german = stripMarkdown(text);
    return out;
  }

  found.sort((a, b) => a.start - b.start);
  for (let i = 0; i < found.length; i++) {
    const from = found[i].end;
    const to = i + 1 < found.length ? found[i + 1].start : text.length;
    const val = stripMarkdown(text.slice(from, to));
    const key = found[i].key as keyof AvatarReply;
    if (key !== "raw") out[key] = val;
  }
  return out;
}

/** Session-end feedback report sections */
export type FeedbackReport = {
  score: string;
  strengths: string;
  mistakes: string;
  vocab: string;
  next: string;
  raw: string;
};

/** AI grade for exam Schreiben (writing) tasks */
export type ExamWritingReport = {
  score: string;
  task: string;
  grammar: string;
  vocab: string;
  fixes: string;
  raw: string;
};

export function parseExamWriting(text: string): ExamWritingReport {
  const get = (re: RegExp) => {
    const m = text.match(re);
    return m ? stripMarkdown(m[1]) : "";
  };
  return {
    score: get(/SCORE:\s*([^\n]*)/i),
    task: get(/TASK:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i),
    grammar: get(/GRAMMAR:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i),
    vocab: get(/VOCAB:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i),
    fixes: get(/FIXES:\s*([\s\S]*?)$/i),
    raw: text,
  };
}

/** AI rubric for exam Sprechen tasks */
export type ExamSpeakingReport = {
  fluency: string;
  vocab: string;
  accuracy: string;
  pronunciation: string;
  mistakes: string;
  cefr: string;
  raw: string;
};

export function parseExamSpeaking(text: string): ExamSpeakingReport {
  const get = (re: RegExp) => {
    const m = text.match(re);
    return m ? stripMarkdown(m[1]) : "";
  };
  return {
    fluency: get(/FLUENCY:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i),
    vocab: get(/VOCAB:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i),
    accuracy: get(/ACCURACY:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i),
    pronunciation: get(/PRONUNCIATION:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i),
    mistakes: get(/MISTAKES:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i),
    cefr: get(/CEFR:\s*([^\n]*)/i),
    raw: text,
  };
}

/** Extract a leading "n/15" or "n-15" score from an AI writing grade */
export function parseScoreOutOf15(score: string): number | null {
  const m = score.match(/(\d+(?:\.\d+)?)\s*(?:\/|out of|von)\s*15/i);
  if (m) return Math.max(0, Math.min(15, parseFloat(m[1])));
  const n = parseFloat(score);
  return Number.isFinite(n) ? Math.max(0, Math.min(15, n)) : null;
}

/** Extract the first rating (1-5) from a rubric line like "4 — good ..." */
export function parseRatingOutOf5(rubricLine: string): number | null {
  const m = rubricLine.match(/\b([1-5])\b/);
  return m ? parseInt(m[1], 10) : null;
}

export function parseFeedback(text: string): FeedbackReport {
  const get = (re: RegExp) => {
    const m = text.match(re);
    return m ? stripMarkdown(m[1]) : "";
  };
  return {
    score: get(/SCORE:\s*([^\n]*)/i),
    strengths: get(/STRENGTHS:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i),
    mistakes: get(/MISTAKES:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i),
    vocab: get(/VOCAB:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i),
    next: get(/NEXT:\s*[\s\S]*?$/i),
    raw: text,
  };
}
