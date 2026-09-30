"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import AvatarPicker from "@/components/AvatarPicker";
import ChatList, { type ChatMsg } from "@/components/ChatList";
import MicButton from "@/components/MicButton";
import { speakSmart, stopSpeaking, listen, loadVoices, isSpeakingSupported, isEcho } from "@/lib/speech";
import { parseReply, parseFeedback, type FeedbackReport } from "@/lib/parse";
import { recordSession, countVocab } from "@/lib/progress";
import { getStoredAvatar, storeAvatar, AVATARS } from "@/lib/avatars";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const TOPIC_CHIPS = [
  "der/die/das articles",
  "Greetings & introductions",
  "Ordering food",
  "Travel (Reisen)",
  "Job interview",
  "Daily routine",
  "Numbers & time",
  "Past tense (Perfekt)",
];

type Phase = "setup" | "chat" | "feedback";

export default function LehrerPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("A1");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [hint, setHint] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null);
  const [textInput, setTextInput] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [avatarKey, setAvatarKey] = useState("jonas");

  useEffect(() => {
    setAvatarKey(getStoredAvatar("jonas"));
  }, []);

  const transcriptRef = useRef<{ role: string; text: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const voiceOnRef = useRef(true);
  const handleStudentRef = useRef<(t: string) => Promise<void>>(async () => {});
  const micRetryRef = useRef(0);
  const avatarTextRef = useRef(""); // last thing Lehrer spoke — for echo detection

  voiceOnRef.current = voiceOn;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, hint]);

  useEffect(() => () => stopSpeaking(), []);

  const autoMic = useCallback(() => {
    if (!voiceOnRef.current) return;
    if (micRetryRef.current > 1) {
      setHint((h) => h || "Tap the mic 🎤 and speak your answer.");
      return;
    }
    setListening(true);
    listen("de-DE", { onInterim: (t) => setTextInput(t) })
      .then(({ text }) => {
        setListening(false);
        setTextInput("");
        if (isEcho(text, avatarTextRef.current)) {
          setTimeout(() => autoMic(), 250); // speaker echo — listen again for the real answer
          return;
        }
        micRetryRef.current = 0;
        handleStudentRef.current(text);
      })
      .catch((e: Error) => {
        setListening(false);
        setTextInput("");
        if (e?.message === "no-speech") {
          micRetryRef.current += 1;
          setTimeout(() => autoMic(), 300);
        } else if (e?.message === "not-allowed") {
          alert("🎤 Microphone permission is blocked. Click the lock icon in the address bar and allow microphone access.");
        }
      });
  }, []);

  const avatarTalk = useCallback(
    (german: string, erklarung: string, after?: () => void) => {
      avatarTextRef.current = `${german} ${erklarung}`; // remember for echo detection
      const finish = () => {
        setSpeaking(false);
        if (after) after();
        else autoMic();
      };
      if (!voiceOnRef.current) {
        finish();
        return;
      }
      setSpeaking(true);
      const isFemale = ["anna", "lena", "sophie"].includes(avatarKey);
      void speakSmart(german, "de-DE", {
        genderHint: isFemale ? "anna" : "lehrer",
        onError: (err) => setVoiceError(err),
        onEnd: () => {
          if (erklarung) {
            void speakSmart(erklarung, "en-IN", {
              genderHint: isFemale ? "anna" : "lehrer",
              rate: 1.0,
              onError: (err) => setVoiceError(err),
              onEnd: finish,
            });
          } else {
            finish();
          }
        },
      });
    },
    [autoMic, avatarKey]
  );

  const testVoice = useCallback(() => {
    setVoiceError("");
    if (!isSpeakingSupported()) {
      setVoiceError("Voice is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    loadVoices().then(() => {
      void speakSmart("Guten Tag! Ich bin dein Lehrer.", "de-DE", {
        genderHint: "lehrer",
        onError: (err) => setVoiceError(err),
      });
    });
  }, []);

  const callAI = useCallback(
    async (messages: { role: "user" | "assistant"; content: string }[], topicArg?: string) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "lehrer",
          level,
          topic: topicArg ?? topic,
          avatarName: AVATARS[avatarKey]?.name ?? "Lehrer",
          messages,
        }),
      });
      return res.json();
    },
    [level, topic, avatarKey]
  );

  const startLesson = async (t?: string) => {
    const chosen = (t ?? topic).trim();
    if (!chosen) return;
    setTopic(chosen);
    loadVoices(); // pre-warm voices inside the user gesture
    setPhase("chat");
    setThinking(true);

    const startMsg = `START — please teach me "${chosen}". My level is ${level}. Give me the first mini-lesson.`;
    const data = await callAI([{ role: "user", content: startMsg }], chosen);
    setThinking(false);

    if (data.offline || data.error || !data.reply) {
      setNeedsKey(true);
      return;
    }
    const parsed = parseReply(data.reply);
    setHistory([
      { role: "user", content: startMsg },
      { role: "assistant", content: data.reply },
    ]);
    setMsgs([{ role: "avatar", german: parsed.german, erklarung: parsed.erklarung, korrektur: parsed.korrektur }]);
    setHint(parsed.hint);
    transcriptRef.current = [{ role: "Lehrer", text: parsed.german }];
    avatarTalk(parsed.german, parsed.erklarung);
  };

  const handleStudent = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      micRetryRef.current = 0;
      setMsgs((m) => [...m, { role: "user", text: clean }]);
      transcriptRef.current.push({ role: "Student", text: clean });
      setThinking(true);

      const newHistory = [...history, { role: "user" as const, content: clean }];
      try {
        const data = await callAI(newHistory);
        setThinking(false);
        if (!data.reply) return;
        const parsed = parseReply(data.reply);
        setHistory([...newHistory, { role: "assistant", content: data.reply }]);
        setMsgs((m) => [...m, { role: "avatar", german: parsed.german, erklarung: parsed.erklarung, korrektur: parsed.korrektur }]);
        setHint(parsed.hint);
        transcriptRef.current.push({ role: "Lehrer", text: parsed.german });
        avatarTalk(parsed.german, parsed.erklarung);
      } catch {
        setThinking(false);
      }
    },
    [history, callAI, avatarTalk]
  );

  handleStudentRef.current = handleStudent;

  const endSession = useCallback(async () => {
    stopSpeaking();
    setSpeaking(false);
    setListening(false);
    setThinking(true);
    const transcript = transcriptRef.current.map((t) => `${t.role}: ${t.text}`).join("\n");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "feedback",
          level,
          topic,
          messages: [{ role: "user", content: `TRANSCRIPT:\n${transcript}` }],
        }),
      });
      const data = await res.json();
      if (data.reply) {
        const rep = parseFeedback(data.reply);
        setFeedback(rep);
        recordSession({
          minutes: Math.max(3, Math.round(transcriptRef.current.length * 0.6)),
          words: countVocab(rep.vocab),
          level,
        });
      } else {
        setFeedback(null);
      }
    } catch {
      setFeedback(null);
    }
    setThinking(false);
    setPhase("feedback");
  }, [level, topic]);

  const onMic = async () => {
    if (listening || thinking) return;
    stopSpeaking();
    setSpeaking(false);
    setListening(true);
    try {
      const { text } = await listen("de-DE", { onInterim: (t) => setTextInput(t) });
      setListening(false);
      setTextInput("");
      if (isEcho(text, avatarTextRef.current)) return; // avatar's own voice leaked into the mic
      await handleStudentRef.current(text);
    } catch (e: unknown) {
      setListening(false);
      setTextInput("");
      const msg = e instanceof Error ? e.message : "";
      if (msg === "not-allowed") {
        alert("🎤 Microphone permission is blocked. Click the lock icon in the address bar and allow microphone access.");
      }
    }
  };

  const sendText = () => {
    const t = textInput.trim();
    if (!t) return;
    setTextInput("");
    handleStudentRef.current(t);
  };

  const toggleVoice = () => {
    if (voiceOn) {
      stopSpeaking();
      setSpeaking(false);
      setListening(false);
    }
    setVoiceOn(!voiceOn);
  };

  /* ================= SCREENS ================= */

  if (phase === "feedback") {
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-3xl mx-auto w-full">
        <Link href="/practice" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100">← Back</Link>
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📋</div>
          <h1 className="text-3xl font-extrabold">Lesson Report — Lehrer</h1>
          <p className="text-sm opacity-60 mt-1">Topic: {topic} • Level {level}</p>
        </div>
        {feedback ? (
          <div className="glass rounded-3xl p-8 w-full space-y-5">
            <div className="flex items-center gap-4">
              <div className="text-5xl font-extrabold text-amber-400">{feedback.score || "–"}</div>
              <div className="text-left">
                <div className="text-sm opacity-60">SCORE</div>
                <div className="font-semibold">/ 10</div>
              </div>
            </div>
            {[["💪 Strengths", feedback.strengths], ["🔧 Corrections", feedback.mistakes], ["📚 Vocabulary", feedback.vocab], ["🎯 Next step", feedback.next]].map(([t, b]) =>
              b ? (
                <div key={t} className="text-left">
                  <div className="font-bold mb-1">{t}</div>
                  <p className="text-sm opacity-85 leading-relaxed whitespace-pre-line">{b}</p>
                </div>
              ) : null
            )}
          </div>
        ) : (
          <div className="glass rounded-3xl p-8 w-full text-center opacity-80">Could not generate the report. Please try again.</div>
        )}
        <div className="flex gap-4 mt-8">
          <button onClick={() => { setMsgs([]); setHistory([]); transcriptRef.current = []; setPhase("setup"); }} className="btn-primary">
            📚 New topic
          </button>
          <Link href="/practice/anna" className="btn-ghost">🗣️ Talk with Anna</Link>
        </div>
      </main>
    );
  }

  if (phase === "setup" || needsKey) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-14 max-w-3xl mx-auto w-full">
        <Link href="/practice" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100">← Back</Link>

        <Avatar variant={avatarKey} size={170} />

        {voiceError && (
          <div className="mt-4 max-w-md w-full bg-red-500/15 border border-red-400/40 rounded-xl px-4 py-3 text-sm text-red-300">
            ⚠️ {voiceError}
          </div>
        )}

        {needsKey ? (
          <div className="glass rounded-3xl p-8 mt-6 w-full">
            <h2 className="text-xl font-bold mb-3">⚡ Lehrer needs an AI brain — 2 minute setup (FREE)</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm opacity-90 leading-relaxed">
              <li>Go to <a className="text-amber-400 underline" href="https://console.groq.com" target="_blank" rel="noreferrer">console.groq.com</a> → sign in with Google (free, no card)</li>
              <li>"API Keys" → "Create API Key" → copy it</li>
              <li>In the project folder, create a file <code className="bg-white/10 px-2 py-0.5 rounded">.env.local</code> containing:<br />
                <code className="bg-white/10 px-2 py-0.5 rounded block mt-1">GROQ_API_KEY=gsk_your_key_here</code></li>
              <li>Restart: <code className="bg-white/10 px-2 py-0.5 rounded">npm run dev</code></li>
            </ol>
            <p className="text-xs opacity-60 mt-4">Free tier: thousands of requests per day, no credit card. Anna&apos;s café demo works without any key.</p>
            <div className="flex gap-3 mt-6">
              <Link href="/practice/anna" className="btn-primary text-sm">Try Anna (offline demo) →</Link>
              <button onClick={() => setNeedsKey(false)} className="btn-ghost text-sm">← Pick a topic</button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl md:text-4xl font-extrabold mt-4 text-center">
              What do you want to learn today? 📚
            </h1>
            <p className="opacity-70 mt-2 text-center text-sm md:text-base">
              Type a topic or tap a chip — Lehrer will teach it at your level, natively and with feedback.
            </p>

            {/* teacher picker */}
            <div className="glass rounded-3xl p-4 mt-6">
              <div className="text-xs font-bold tracking-widest text-center opacity-60 mb-2">CHOOSE YOUR TEACHER 🎭</div>
              <AvatarPicker
                value={avatarKey}
                onChange={(k) => { setAvatarKey(k); storeAvatar(k); }}
                filter={["sophie", "jonas", "markus", "raj"]}
              />
            </div>

            {/* level selector */}
            <div className="flex gap-2 mt-7 flex-wrap justify-center">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`w-12 h-12 rounded-xl font-extrabold transition-all ${
                    level === l
                      ? "german-gradient scale-110 text-black shadow-lg"
                      : "glass opacity-60 hover:opacity-100"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* topic chips */}
            <div className="flex gap-2 mt-6 flex-wrap justify-center max-w-xl">
              {TOPIC_CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => startLesson(c)}
                  className="glass rounded-full px-4 py-2 text-sm hover:border-amber-400/50 hover:scale-105 transition-all"
                >
                  {c}
                </button>
              ))}
            </div>

            {/* custom topic */}
            <div className="flex w-full max-w-md gap-2 mt-6">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startLesson()}
                placeholder="…or type your own topic, e.g. 'Goethe A1 speaking exam'"
                className="flex-1 rounded-full px-5 py-3 bg-white/8 border border-white/15 placeholder-white/35 outline-none focus:border-amber-400 text-sm"
              />
              <button onClick={() => startLesson()} className="btn-primary !py-3 !px-6 text-sm whitespace-nowrap">
                Start ▶
              </button>
            </div>

            <button onClick={testVoice} className="mt-5 text-xs opacity-70 hover:opacity-100 underline">
              🔊 Test Lehrer&apos;s voice first
            </button>

            {thinking && <p className="mt-4 text-sm opacity-70 animate-pulse">Lehrer is preparing your lesson… ✍️</p>}
          </>
        )}
      </main>
    );
  }

  /* ================= CHAT ================= */
  return (
    <main className="min-h-screen flex flex-col px-4 md:px-8 py-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4 gap-2">
        <Link href="/practice" className="text-sm opacity-70 hover:opacity-100 shrink-0">← Back</Link>
        <div className="text-center">
          <div className="font-extrabold text-lg">👨‍🏫 Lehrer</div>
          <div className="text-xs opacity-60">📚 {topic} • Level {level}</div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={toggleVoice} className="text-sm glass rounded-full px-4 py-2 hover:bg-white/10">
            {voiceOn ? "🔊 Voice ON" : "🔇 Voice OFF"}
          </button>
          <button onClick={endSession} className="text-sm glass rounded-full px-4 py-2 hover:bg-white/10">
            End & report 📋
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        <div className="glass rounded-3xl p-6 flex flex-col items-center justify-center gap-4 md:w-64 shrink-0">
          <Avatar variant={avatarKey} size={190} speaking={speaking} />
          {listening && (
            <div className="text-sm text-red-400 font-semibold animate-pulse">🎙️ Listening… speak now</div>
          )}
          {thinking && !listening && (
            <div className="text-sm opacity-70 animate-pulse">Lehrer is thinking… 🤔</div>
          )}
          {hint && !listening && (
            <div className="w-full text-left bg-blue-400/10 border border-blue-400/30 rounded-xl px-3 py-2">
              <div className="text-[10px] font-bold tracking-widest text-blue-300 mb-1">🎯 PRACTICE</div>
              <p className="text-sm leading-snug">{hint}</p>
            </div>
          )}
          {speaking && (
            <button
              onClick={() => { stopSpeaking(); setSpeaking(false); autoMic(); }}
              className="text-xs glass rounded-full px-3 py-1.5 hover:bg-white/10"
            >
              ⏭️ Skip voice
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col glass rounded-3xl p-4 md:p-6 min-h-[55vh]">
          <div className="flex-1 overflow-y-auto pr-1 mb-4 max-h-[52vh]">
            <ChatList messages={msgs} avatarColor="bg-blue-600/80" />
            <div ref={chatEndRef} />
          </div>

          <div className="flex flex-col items-center gap-5 pt-2 border-t border-white/10">
            <MicButton listening={listening} disabled={thinking} onClick={onMic} />
            <div className="flex w-full gap-2 mt-2">
              <input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendText()}
                placeholder="Answer in German, or ask a question… (English is fine too)"
                className="flex-1 rounded-full px-5 py-3 bg-white/8 border border-white/15 placeholder-white/35 outline-none focus:border-amber-400 text-sm"
              />
              <button onClick={sendText} className="btn-primary !py-2 !px-5 text-sm">Send</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
