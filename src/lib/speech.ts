"use client";

/**
 * SprachDost Speech Engine — 100% FREE, no API key needed.
 * Uses the browser's built-in Web Speech API:
 *  - SpeechSynthesis (German + English TTS, free voices in Chrome/Edge)
 *  - SpeechRecognition (German + English mic input)
 *
 * Hardened against known Chrome quirks:
 *  - never calls cancel() on an idle engine (cancel-then-speak = silent utterance bug)
 *  - watchdog timer in case onend never fires (long text / network voices)
 */

export type SpeakCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
  onBoundary?: (charIndex: number) => void;
};

let cachedVoices: SpeechSynthesisVoice[] | null = null;
let voiceLoadPromise: Promise<SpeechSynthesisVoice[]> | null = null;

/* ---------------- Debug instrumentation (temporary) ---------------- */

export type VoiceDebugInfo = {
  event: "queued" | "start" | "end" | "error" | "timeout" | "voices";
  text: string;
  lang: string;
  voiceName: string;
  voiceCount: number;
  detail: string;
};

let debugHandler: ((d: VoiceDebugInfo) => void) | null = null;

export function onVoiceDebug(cb: (d: VoiceDebugInfo) => void) {
  debugHandler = cb;
}

function dbg(event: VoiceDebugInfo["event"], text: string, lang: string, detail = "") {
  if (!debugHandler) return;
  debugHandler({
    event,
    text: text.slice(0, 40),
    lang,
    voiceName: lastChosenVoice,
    voiceCount: cachedVoices?.length ?? 0,
    detail,
  });
}

let lastChosenVoice = "not-yet";

/** Call this EARLY (e.g. inside the user's first click) so voices are ready. */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }
  if (cachedVoices && cachedVoices.length) return Promise.resolve(cachedVoices);
  if (voiceLoadPromise) return voiceLoadPromise;

  voiceLoadPromise = new Promise((resolve) => {
    const done = (v: SpeechSynthesisVoice[]) => {
      cachedVoices = v;
      resolve(v);
    };
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      done(existing);
      return;
    }
    window.speechSynthesis.addEventListener("voiceschanged", () => done(window.speechSynthesis.getVoices()), { once: true });
    // Chrome sometimes needs a nudge
    window.speechSynthesis.getVoices();
    // fallback: never hang forever
    setTimeout(() => done(window.speechSynthesis.getVoices()), 1500);
  });
  return voiceLoadPromise;
}

/**
 * Scored voice picker — squeezes the most natural sound out of FREE voices:
 *   Edge:  "Microsoft ... Online (Natural) Katja/Conrad"  → near-human neural, free
 *   Chrome: "Google Deutsch"                                → online, quite natural
 *   Apple: Melina / Anna / enhanced / premium / Siri        → best local quality
 *   fallback: any same-language voice
 */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
  genderHint?: "anna" | "lehrer"
) {
  const pref = lang.toLowerCase();
  const base = pref.split("-")[0].split("_")[0];
  const same = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  if (same.length === 0) return null;

  const preferFemale = genderHint !== "lehrer";
  const score = (v: SpeechSynthesisVoice): number => {
    const n = v.name.toLowerCase();
    let s = 0;
    // engine quality
    if (/microsoft/.test(n) && /(online|natural)/.test(n)) s += 100; // Edge neural
    if (/google/.test(n)) s += 85;                                    // Chrome online
    if (/(natural|neural)/.test(n)) s += 60;
    if (/(enhanced|premium|siri)/.test(n)) s += 50;                   // Apple quality tiers
    if (!v.localService) s += 25;                                     // network voices are usually better
    // known-good German voices by name
    if (/(katja|melina|conrad|hedda|stefan|klaus)/.test(n)) s += 40;
    if (/\banna\b/.test(n)) s += 30;
    // gender fit
    const female = /(female|katja|melina|hedda|petra|anna|lena|sabine|marlene|vicki)/.test(n);
    const male = /(male|conrad|stefan|klaus|markus|jonas|rainer|yannick)/.test(n);
    if (preferFemale && female) s += 20;
    if (preferFemale && male) s -= 15;
    if (!preferFemale && male) s += 20;
    if (!preferFemale && female) s -= 15;
    // exact locale match beats generic
    if (v.lang.toLowerCase() === pref) s += 15;
    // avoid known robotic/legacy voices
    if (/(compact|espeak|samba|bad news|novelty)/.test(n)) s -= 40;
    return s;
  };

  return same.reduce((best, v) => (score(v) > score(best) ? v : best), same[0]);
}

export function isSpeakingSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Speak text aloud. lang examples: "de-DE", "en-IN", "en-US" */
export function speak(
  text: string,
  lang: string = "de-DE",
  opts: { rate?: number; pitch?: number; genderHint?: "anna" | "lehrer" } & SpeakCallbacks = {}
) {
  if (!isSpeakingSupported()) {
    opts.onError?.("Speech synthesis is not supported in this browser. Please use Chrome or Edge.");
    opts.onEnd?.();
    return;
  }

  const synth = window.speechSynthesis;

  // Chrome bug: cancel() followed by speak() kills the new utterance.
  // Only cancel if engine is genuinely busy, and always resume() after (paused-state bug).
  if (synth.speaking || synth.pending) {
    synth.cancel();
  }
  try {
    synth.resume(); // harmless if not paused; fixes stuck-paused state after cancel()
  } catch {
    /* noop */
  }

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  // natural pacing: a touch slower feels more human for language learners
  utter.rate = opts.rate ?? 0.92;
  utter.pitch = opts.pitch ?? (opts.genderHint === "anna" ? 1.1 : 0.9);
  utter.volume = 1;

  let finished = false;
  let watchdog: ReturnType<typeof setTimeout> | null = null;

  const finish = (why = "end") => {
    if (finished) return;
    finished = true;
    if (watchdog) clearTimeout(watchdog);
    dbg(why === "end" ? "end" : "timeout", text, lang, why);
    opts.onEnd?.();
  };

  utter.onstart = () => {
    dbg("start", text, lang, "audio actually started 🔊");
    opts.onStart?.();
  };
  utter.onend = () => finish("end");
  utter.onerror = (e: any) => {
    const err = e?.error || "unknown";
    dbg("error", text, lang, err);
    if (err !== "interrupted" && err !== "canceled") {
      opts.onError?.(`Voice error: ${err}`);
    }
    finish("error");
  };
  if (opts.onBoundary) {
    utter.onboundary = (e) => opts.onBoundary?.(e.charIndex);
  }

  loadVoices().then((voices) => {
    const voice = pickVoice(voices, lang, opts.genderHint);
    lastChosenVoice = voice ? `${voice.name} (${voice.lang})${voice.localService ? "" : " [online]"}` : "browser-default";
    dbg("voices", text, lang, `${voices.length} voices, using: ${lastChosenVoice}`);
    if (voice) utter.voice = voice;

    const estMs = Math.max(2500, text.length * 90 + 3000);
    watchdog = setTimeout(() => finish("timeout"), estMs);

    dbg("queued", text, lang);
    synth.speak(utter);

    // Chrome occasionally needs a second resume nudge after speak()
    setTimeout(() => {
      try {
        window.speechSynthesis.resume();
      } catch {
        /* noop */
      }
    }, 100);
  });
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      /* noop */
    }
    currentAudio = null;
  }
}

let currentAudio: HTMLAudioElement | null = null;

/**
 * Smart speak: tries the neural voice API (if ELEVENLABS_API_KEY is configured
 * on the server), otherwise seamlessly falls back to the free browser voice.
 * Same callbacks as speak(), so callers don't need to care which engine plays.
 */
export async function speakSmart(
  text: string,
  lang: string,
  opts: Parameters<typeof speak>[2] = {}
) {
  if (typeof window === "undefined") return;

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang, gender: opts.genderHint ?? "anna" }),
    });
    const ct = res.headers.get("content-type") ?? "";
    if (res.ok && ct.includes("audio")) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      audio.onplay = () => opts.onStart?.();
      audio.onended = () => {
        URL.revokeObjectURL(url);
        currentAudio = null;
        opts.onEnd?.();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        currentAudio = null;
        opts.onEnd?.();
      };
      await audio.play();
      return;
    }
  } catch {
    /* fall through to browser voice */
  }

  speak(text, lang, opts);
}


export type ListenResult = {
  text: string;
  confidence: number;
};

export function isListeningSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

/**
 * Listen once to microphone. lang: "de-DE" | "en-IN" etc.
 * onInterim: live transcript while speaking (shown in UI so user sees what's being heard)
 * Auto-stops when user finishes speaking (onspeechend) + hard timeout so UI NEVER sticks on "Listening…"
 */
export function listen(
  lang: string = "de-DE",
  opts: { onInterim?: (text: string) => void; maxMs?: number } = {}
): Promise<ListenResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("no-window"));
      return;
    }
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      reject(new Error("Speech recognition not supported — please use Chrome or Edge."));
      return;
    }
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    let settled = false;
    let lastInterim = "";
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (hardStop) clearTimeout(hardStop);
      fn();
    };

    // hard timeout — kabhi "Listening…" pe atke nahi
    const hardStop = setTimeout(() => {
      try {
        rec.stop();
      } catch {}
      done(() =>
        lastInterim
          ? resolve({ text: lastInterim, confidence: 0.5 })
          : reject(new Error("no-speech"))
      );
    }, opts.maxMs ?? 12000);

    rec.onresult = (e: any) => {
      const res = e.results[e.results.length - 1];
      const alt = res[0];
      lastInterim = alt.transcript;
      if (res.isFinal) {
        done(() => resolve({ text: alt.transcript, confidence: alt.confidence ?? 0 }));
      } else {
        opts.onInterim?.(alt.transcript);
      }
    };
    // user finishes speaking → stop immediately (fast response, no long wait)
    rec.onspeechend = () => {
      setTimeout(() => {
        done(() => {
          if (lastInterim) resolve({ text: lastInterim, confidence: 0.5 });
          else reject(new Error("no-speech"));
        });
      }, 800); // browser ko final result dene ka chhota window
    };
    rec.onerror = (e: any) => done(() => reject(new Error(e.error || "mic error")));
    rec.start();
  });
}

/** Normalize German/user text for fuzzy matching */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ä]/g, "a")
    .replace(/[ö]/g, "o")
    .replace(/[ü]/g, "u")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Count how many keywords appear in spoken text (fuzzy, umlaut-safe) */
export function keywordScore(spoken: string, keywords: string[]): number {
  const s = norm(spoken);
  let hits = 0;
  for (const k of keywords) {
    const nk = norm(k);
    if (nk && s.includes(nk)) hits++;
  }
  return hits;
}

/**
 * Echo detection — the mic can pick up the avatar's own TTS from the speakers,
 * which looks like a user answer. Returns true if `heard` is basically `spokenText`.
 */
export function isEcho(heard: string, spokenText: string): boolean {
  const h = norm(heard);
  const s = norm(spokenText);
  if (!h || !s) return false;
  const hWords = new Set(h.split(" ").filter((w) => w.length > 2));
  if (hWords.size === 0) return false;
  const sWords = new Set(s.split(" "));
  let overlap = 0;
  for (const w of hWords) if (sWords.has(w)) overlap++;
  return overlap / hWords.size >= 0.55; // mostly the same → echo
}
