"use client";

/**
 * Free Talk — Vocal-AI-style voice conversation.
 * Groq streaming → sentence-queue edge-tts → barge-in VAD → live tips → end report.
 * Free: 10 min/day • Pro: unlimited.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import AvatarPicker from "@/components/AvatarPicker";
import { speakSmart, stopSpeaking, listen, loadVoices, isEcho } from "@/lib/speech";
import { parseFeedback, type FeedbackReport } from "@/lib/parse";
import { recordSession, countVocab } from "@/lib/progress";
import { recordWeekly } from "@/lib/weekly";
import { getStoredAvatar, storeAvatar } from "@/lib/avatars";
import { getAccessToken } from "@/lib/supabase";
import { usePro } from "@/lib/usePro";

type Phase = "setup" | "session" | "feedback" | "limit";
type SessionState = "listening" | "thinking" | "speaking";
type Turn = { role: "user" | "ai"; text: string };

const FREE_SECONDS = 600;
const TOPICS = [
  { id: "free", label: "🎲 Kuch bhi" },
  { id: "Alltag", label: "🏠 Alltag" },
  { id: "Reisen", label: "✈️ Reisen" },
  { id: "Arbeit", label: "💼 Arbeit" },
  { id: "Hobbys", label: "⚽ Hobbys" },
  { id: "Essen", label: "🍛 Essen" },
];

export default function FreeTalkPage() {
  const { isPro } = usePro();
  const [phase, setPhase] = useState<Phase>("setup");
  const [topic, setTopic] = useState("free");
  const [avatarKey, setAvatarKey] = useState("anna");
  const [sessionState, setSessionState] = useState<SessionState>("listening");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [interim, setInterim] = useState("");
  const [tips, setTips] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(FREE_SECONDS);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null);
  const [ending, setEnding] = useState(false);

  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const transcriptRef = useRef<{ role: string; text: string }[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const stopQueueRef = useRef(false);
  const speakingRef = useRef(false);
  const forceResolveRef = useRef<(() => void) | null>(null);
  const speakingStartedAt = useRef(0);
  const vadRef = useRef<{ stop: () => void } | null>(null);
  const sessionActiveRef = useRef(false);
  const listenActiveRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const avatarNameRef = useRef("Anna");

  useEffect(() => {
    queueMicrotask(() => setAvatarKey(getStoredAvatar("anna")));
  }, []);

  /* ── session timer (free plan) ── */
  useEffect(() => {
    if (phase !== "session" || isPro) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          void endSession(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isPro]);

  /* ── TTS sentence helpers ── */
  const speakSentence = useCallback((text: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        forceResolveRef.current = null;
        resolve();
      };
      forceResolveRef.current = done;
      speakingStartedAt.current = Date.now();
      speakSmart(text, "de-DE", {
        genderHint: ["anna", "lena", "sophie"].includes(avatarKey) ? "anna" : "lehrer",
        rate: 0.95,
        onEnd: done,
        onError: done,
      });
      // watchdog: force-resolve if onEnd never fires
      setTimeout(done, Math.max(4000, text.length * 130));
    });
  }, [avatarKey]);

  /* ── barge-in: user's voice stops the AI ── */
  const bargeIn = useCallback(() => {
    if (!speakingRef.current) return;
    stopQueueRef.current = true;
    forceResolveRef.current?.();
    stopSpeaking();
  }, []);

  /* ── VAD while the AI speaks (getUserMedia + AnalyserNode) ── */
  const startVad = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      let hotTicks = 0;
      const iv = setInterval(() => {
        if (Date.now() - speakingStartedAt.current < 600) return; // speaker ramp-up
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        if (rms > 0.055) hotTicks++;
        else hotTicks = 0;
        if (hotTicks >= 4) {
          hotTicks = 0;
          bargeIn();
        }
      }, 120);
      vadRef.current = {
        stop: () => {
          clearInterval(iv);
          stream.getTracks().forEach((t) => t.stop());
          ctx.close().catch(() => {});
        },
      };
    } catch {
      /* mic unavailable — no barge-in, still works */
    }
  }, [bargeIn]);

  const stopVad = () => {
    vadRef.current?.stop();
    vadRef.current = null;
  };

  /* ── listening turn ── */
  const startListening = useCallback(() => {
    if (!sessionActiveRef.current || listenActiveRef.current) return;
    listenActiveRef.current = true;
    setSessionState("listening");
    setInterim("");
    setListening(true);
    listen("de-DE", { onInterim: (t) => setInterim(t), maxMs: 15000 })
      .then(({ text }) => {
        listenActiveRef.current = false;
        setListening(false);
        setInterim("");
        if (!sessionActiveRef.current) return;
        if (!text.trim() || isEcho(text, transcriptRef.current.slice(-1)[0]?.role === "ai" ? transcriptRef.current.slice(-1)[0].text : "")) {
          setTimeout(() => startListening(), 300);
          return;
        }
        void handleUser(text.trim());
      })
      .catch((e: Error) => {
        listenActiveRef.current = false;
        setListening(false);
        if (!sessionActiveRef.current) return;
        if (e?.message === "no-speech") {
          setTimeout(() => startListening(), 300);
        } else if (e?.message === "not-allowed") {
          setVoiceError("🎤 Microphone blocked — allow mic access in the address bar, then reload.");
          sessionActiveRef.current = false;
        } else {
          setTimeout(() => startListening(), 500);
        }
      });
  }, [avatarKey]);

  /* ── TTS queue drain ── */
  const drainQueue = useCallback(
    async (queue: { text: string; resolve: () => void }[]) => {
      if (speakingRef.current) return;
      speakingRef.current = true;
      setSessionState("speaking");
      void startVad();
      while (queue.length > 0) {
        if (stopQueueRef.current) break;
        const item = queue.shift()!;
        await speakSentence(item.text);
        item.resolve();
      }
      speakingRef.current = false;
      stopVad();
      const wasStopped = stopQueueRef.current;
      stopQueueRef.current = false;
      queue.length = 0;
      if (!sessionActiveRef.current) return;
      if (wasStopped) {
        setTimeout(() => startListening(), 350);
      } else {
        startListening();
      }
    },
    [speakSentence, startVad, startListening]
  );

  /* ── stream consume + sentence extraction ── */
  const aiTurn = useCallback(
    async (userText: string) => {
      setSessionState("thinking");
      setTurns((t) => [...t, { role: "user", text: userText }]);
      transcriptRef.current.push({ role: "Student", text: userText });
      historyRef.current.push({ role: "user", content: userText });

      const ac = new AbortController();
      abortRef.current = ac;
      setTurns((t) => [...t, { role: "ai", text: "…" }]);
      const aiIdx = -1; // we patch the last turn inline below

      const queue: { text: string; resolve: () => void }[] = [];
      const spokenCount = { n: 0 };
      const pendingQueue: string[] = [];
      const queueFlusher = { running: false };

      const flushQueue = () => {
        if (queueFlusher.running) return;
        queueFlusher.running = true;
        void (async () => {
          // move pending sentences into the ordered queue
          for (const s of pendingQueue.splice(0)) {
            await new Promise<void>((resolve) => queue.push({ text: s, resolve }));
          }
          queueFlusher.running = false;
          if (queue.length > 0 && !speakingRef.current) void drainQueue(queue);
        })();
      };

      try {
        const token = await getAccessToken().catch(() => null);
        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: ac.signal,
          body: JSON.stringify({ messages: historyRef.current, level: "A1", topic, avatarName: avatarNameRef.current }),
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          if (data?.limit) {
            sessionActiveRef.current = false;
            setPhase("limit");
            return;
          }
          throw new Error("stream failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";

        const extractSentences = () => {
          const m = full.match(/GERMAN:\s*([\s\S]*?)(?=\nKORREKTUR:|$)/i);
          if (!m) return;
          const value = m[1];
          const parts = value.split(/(?<=[.!?…])\s+/);
          for (let i = spokenCount.n; i < parts.length; i++) {
            const s = parts[i].trim();
            if (s.length > 1) {
              spokenCount.n = i + 1;
              pendingQueue.push(s);
            }
          }
          if (pendingQueue.length > 0) flushQueue();
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          for (const line of buffer.split("\n\n")) {
            if (!line.startsWith("data:")) continue;
            try {
              const j = JSON.parse(line.slice(5).trim());
              if (j.delta) {
                full += j.delta;
                extractSentences();
                // live-patch the last ai turn
                setTurns((t) => {
                  const copy = [...t];
                  copy[copy.length - 1] = { role: "ai", text: full.replace(/^GERMAN:\s*/i, "").replace(/\nKORREKTUR:[\s\S]*$/i, "") || "…" };
                  return copy;
                });
              }
              if (j.done) {
                // flush the tail of the GERMAN line as a sentence
                extractSentences();
                const km = full.match(/KORREKTUR:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i);
                const tip = km?.[1]?.trim();
                if (tip && !/^none$/i.test(tip)) setTips((p) => [...p.slice(-4), tip]);
                const finalText = (full.match(/GERMAN:\s*([\s\S]*?)(?=\nKORREKTUR:|$)/i)?.[1] ?? full).trim();
                setTurns((t) => {
                  const copy = [...t];
                  copy[copy.length - 1] = { role: "ai", text: finalText };
                  return copy;
                });
                transcriptRef.current.push({ role: avatarNameRef.current, text: finalText });
                historyRef.current.push({ role: "assistant", content: full });
              }
              if (j.error || j.offline) {
                setVoiceError("AI not reachable — try again in a moment.");
              }
            } catch {
              /* partial line */
            }
          }
        }
        // wait until the queue fully drains
        await new Promise<void>((resolve) => {
          const iv = setInterval(() => {
            if (queue.length === 0 && pendingQueue.length === 0 && !speakingRef.current) {
              clearInterval(iv);
              resolve();
            }
          }, 150);
        });
        void aiIdx;
      } catch (e: unknown) {
        if ((e as Error)?.name !== "AbortError") {
          setVoiceError("Connection hiccup — try again.");
        }
      }
      if (sessionActiveRef.current && !stopQueueRef.current) {
        setTimeout(() => startListening(), 300);
      }
    },
    [topic, drainQueue, startListening]
  );

  const handleUser = useCallback(
    (text: string) => {
      if (!sessionActiveRef.current) return;
      void aiTurn(text);
    },
    [aiTurn]
  );

  /* ── session control ── */
  const startSession = async () => {
    loadVoices();
    avatarNameRef.current = avatarKey.charAt(0).toUpperCase() + avatarKey.slice(1);
    sessionActiveRef.current = true;
    stopQueueRef.current = false;
    historyRef.current = [];
    transcriptRef.current = [];
    setTurns([]);
    setTips([]);
    setSecondsLeft(FREE_SECONDS);
    setVoiceError(null);
    setPhase("session");
    const opener = `START — we are having a free spoken German conversation${topic !== "free" ? ` about: ${topic}` : ""}. My level is A1. Greet me warmly and ask me ONE simple question to get started.`;
    void aiTurn(opener);
  };

  const endSession = useCallback(async (timeUp = false) => {
    sessionActiveRef.current = false;
    stopQueueRef.current = true;
    forceResolveRef.current?.();
    abortRef.current?.abort();
    stopSpeaking();
    stopVad();
    setEnding(true);
    const minutes = Math.max(1, Math.round(transcriptRef.current.length * 0.35));
    recordWeekly({ minutes });
    try {
      const transcript = transcriptRef.current.map((t) => `${t.role}: ${t.text}`).join("\n");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "feedback",
          level: "A1",
          messages: [{ role: "user", content: `TRANSCRIPT:\n${transcript}` }],
        }),
      });
      const data = await res.json();
      const rep = data.reply ? parseFeedback(data.reply) : null;
      if (rep) recordSession({ minutes, words: countVocab(rep.vocab), level: "Free Talk" });
      setFeedback(rep);
    } catch {
      setFeedback(null);
      recordSession({ minutes, words: 0, level: "Free Talk" });
    }
    setEnding(false);
    setPhase("feedback");
    void timeUp;
  }, []);

  const mmss = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  /* ───────── screens ───────── */

  if (phase === "setup") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full text-center">
        <Link href="/practice" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100">← Back</Link>
        <div className="text-6xl mb-4">🎙️</div>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Free Talk</h1>
        <p className="opacity-70 text-sm mb-8 max-w-md">
          Voice-AI-style baat-cheet: just speak — koi bhi topic, natural German conversation with
          live corrections. Bolte waqt AI ko rok bhi sakte ho (just speak over it).
        </p>

        <div className="text-xs font-bold tracking-widest opacity-60 mb-3">CHOOSE YOUR PARTNER 🎭</div>
        <div className="glass rounded-3xl p-4 mb-6 w-full">
          <AvatarPicker value={avatarKey} onChange={(k) => { setAvatarKey(k); storeAvatar(k); }} filter={["anna", "markus", "lena", "raj"]} />
        </div>

        <div className="flex gap-2 justify-center mb-8 flex-wrap">
          {TOPICS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTopic(t.id)}
              className={`rounded-full px-4 py-2 text-sm transition-all ${
                topic === t.id ? "german-gradient font-bold text-black" : "glass opacity-70 hover:opacity-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button onClick={startSession} className="btn-primary !py-4 !px-10 w-full text-lg">
          🎙️ Start talking →
        </button>
        <p className="text-xs opacity-50 mt-4">
          {isPro ? "♾️ Pro: unlimited" : `⏱️ Free: 10 min/day`} • Chrome/Edge + mic needed • AI ko beech me rokne ke liye bas bolna shuru kar do
        </p>
      </main>
    );
  }

  if (phase === "limit") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full text-center">
        <div className="text-6xl mb-4">🚦</div>
        <h1 className="text-2xl font-extrabold mb-3">Aaj ka free talk khatam</h1>
        <p className="opacity-70 text-sm mb-6">
          Daily free limit reach ho gayi. Kal wapas aa jao — ya Pro lo unlimited free talk, exam grading aur sab ke liye.
        </p>
        <div className="flex gap-3">
          <Link href="/pro" className="btn-primary text-sm">✨ See Pro →</Link>
          <Link href="/practice" className="btn-ghost text-sm">← Practice hub</Link>
        </div>
      </main>
    );
  }

  if (phase === "feedback" || ending) {
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-2xl mx-auto w-full text-center">
        <div className="text-5xl mb-3 animate-pulse">{ending ? "📝" : "📋"}</div>
        <h1 className="text-2xl font-extrabold mb-1">{ending ? "Report bana raha hoon…" : "Free Talk Report"}</h1>
        {!ending && <p className="text-sm opacity-60 mb-6">{turns.filter((t) => t.role === "user").length} baar aapne bola • 💡 {tips.length} tips</p>}
        {!ending && feedback && (
          <div className="glass rounded-3xl p-8 w-full space-y-5 text-left mb-6">
            <div className="flex items-center gap-4">
              <div className="text-5xl font-extrabold text-amber-400">{feedback.score || "–"}</div>
              <div className="text-left"><div className="text-sm opacity-60">SCORE</div><div className="font-semibold">/ 10</div></div>
            </div>
            {[["💪 Strengths", feedback.strengths], ["🔧 To improve", feedback.mistakes], ["📚 Vocabulary", feedback.vocab], ["🎯 Next step", feedback.next]].map(([t, b]) =>
              b ? (
                <div key={t}>
                  <div className="font-bold mb-1">{t}</div>
                  <p className="text-sm opacity-85 leading-relaxed whitespace-pre-line">{b}</p>
                </div>
              ) : null
            )}
          </div>
        )}
        {!ending && !feedback && <p className="glass rounded-2xl p-6 text-sm opacity-70 mb-6">Report generate nahi ho paya — koi baat nahi, session count ho gaya! 💪</p>}
        {!ending && (
          <div className="flex gap-3">
            <button onClick={() => { setPhase("setup"); setTurns([]); setTips([]); transcriptRef.current = []; historyRef.current = []; }} className="btn-primary text-sm">
              🎙️ Talk again
            </button>
            <Link href="/practice" className="btn-ghost text-sm">← Practice hub</Link>
          </div>
        )}
      </main>
    );
  }

  /* ───────── session (voice UI) ───────── */
  const stateLabel =
    sessionState === "listening"
      ? listening ? "🎙️ Main sun rahi hoon…" : "🎙️ Aap ki baari — boliye!"
      : sessionState === "thinking"
        ? "🤔 Soch rahi hoon…"
        : "🗣️ Bol rahi hoon… (rokne ke liye bolna shuru karein)";

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-8 max-w-2xl mx-auto w-full">
      <div className="w-full flex items-center justify-between mb-6">
        <button onClick={() => void endSession()} className="text-sm glass rounded-full px-4 py-2 hover:bg-white/10">End & report 📋</button>
        <div className="text-sm opacity-70">{isPro ? "♾️ Pro" : `⏱️ ${mmss}`}</div>
      </div>

      {/* orb */}
      <div className="relative flex flex-col items-center justify-center my-6">
        <div
          className={`rounded-full absolute transition-all duration-500 ${
            sessionState === "speaking"
              ? "w-56 h-56 german-gradient opacity-30 animate-ping"
              : sessionState === "thinking"
                ? "w-40 h-40 bg-amber-400/20"
                : "w-44 h-44 bg-sky-400/20"
          }`}
        />
        <Avatar variant={avatarKey} size={150} speaking={sessionState === "speaking"} />
      </div>
      <div className="font-extrabold text-lg mb-2">{stateLabel}</div>
      {interim && <p className="text-sm text-sky-300 italic mb-2">“{interim}”</p>}
      {voiceError && <p className="text-xs text-yellow-400/90 mb-2">{voiceError}</p>}

      {tips.length > 0 && (
        <div className="glass rounded-2xl px-4 py-2 mb-4 max-w-full">
          <div className="text-[10px] font-bold tracking-widest text-amber-300 mb-1">💡 LIVE TIP</div>
          <p className="text-xs leading-snug">{tips[tips.length - 1]}</p>
        </div>
      )}

      {/* transcript ticker */}
      <div className="w-full flex-1 overflow-y-auto max-h-[38vh] space-y-2 mb-4">
        {turns.map((t, i) => (
          <div key={i} className={`text-sm leading-snug rounded-xl px-4 py-2 ${t.role === "user" ? "bg-white/5 ml-10 text-right" : "glass mr-10"}`}>
            <span className="opacity-40 text-[10px] uppercase tracking-widest mr-2">{t.role === "user" ? "You" : avatarNameRef.current}</span>
            {t.text}
          </div>
        ))}
      </div>
    </main>
  );
}
