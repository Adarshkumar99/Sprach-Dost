"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import AvatarPicker from "@/components/AvatarPicker";
import ChatList, { type ChatMsg } from "@/components/ChatList";
import MicButton from "@/components/MicButton";
import { speakSmart, stopSpeaking, listen, loadVoices, isEcho } from "@/lib/speech";
import { parseReply, parseFeedback, type FeedbackReport } from "@/lib/parse";
import { recordSession, countVocab } from "@/lib/progress";
import { SCENARIOS, SCENARIO_CATEGORIES, getScenario, SCENARIO_LEVEL_COLORS, type Scenario } from "@/lib/scenarios";
import { getStoredAvatar, storeAvatar } from "@/lib/avatars";

type Phase = "select" | "chat" | "feedback";
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function AnnaPage() {
  /* ---------- picker state ---------- */
  const [phase, setPhase] = useState<Phase>("select");
  const [category, setCategory] = useState<string>("Food & Drink");
  const [level, setLevel] = useState("A1");
  const [avatarKey, setAvatarKey] = useState("anna");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [needsKey, setNeedsKey] = useState(false);

  /* ---------- chat state ---------- */
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [hint, setHint] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null);
  const [textInput, setTextInput] = useState("");

  const transcriptRef = useRef<{ role: string; text: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const voiceOnRef = useRef(true);
  const handleStudentRef = useRef<(t: string) => Promise<void>>(async () => {});
  const micRetryRef = useRef(0);
  const avatarNameRef = useRef("Anna");
  const avatarTextRef = useRef(""); // last thing the avatar spoke — used to filter speaker echo

  voiceOnRef.current = voiceOn;

  useEffect(() => {
    setAvatarKey(getStoredAvatar("anna"));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, hint]);

  useEffect(() => () => stopSpeaking(), []);

  /* ---------- voice loop ---------- */
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
        // echo guard: if the mic just heard the avatar's own voice from the speakers, drop it
        if (isEcho(text, avatarTextRef.current)) {
          setTimeout(() => autoMic(), 250); // listen again for the real user answer
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
        onError: () => {},
        onEnd: () => {
          if (erklarung) {
            void speakSmart(erklarung, "en-IN", {
              genderHint: isFemale ? "anna" : "lehrer",
              rate: 1.0,
              onError: () => {},
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

  /* ---------- call the AI ---------- */
  const callAI = useCallback(
    async (messages: { role: "user" | "assistant"; content: string }[], sc?: Scenario) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "anna",
          level,
          topic: "",
          scenarioId: sc?.id ?? scenario?.id ?? "",
          avatarName: avatarNameRef.current,
          messages,
        }),
      });
      return res.json();
    },
    [level, scenario]
  );

  /* ---------- start selected scenario ---------- */
  const startScenario = async (sc: Scenario, avatar: string) => {
    setScenario(sc);
    avatarNameRef.current = avatar.charAt(0).toUpperCase() + avatar.slice(1);
    loadVoices(); // pre-warm within the user gesture
    setPhase("chat");
    setThinking(true);
    setMsgs([]);
    setHistory([]);
    setHint("");
    transcriptRef.current = [];

    const startMsg = `START — begin the "${sc.title}" role-play. My level is ${level}. Start with your opening line (in character).`;
    let data;
    try {
      data = await callAI([{ role: "user", content: startMsg }], sc);
    } catch {
      data = { offline: true };
    }
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
    const first: ChatMsg = { role: "avatar", german: parsed.german, erklarung: parsed.erklarung, korrektur: parsed.korrektur };
    setMsgs([first]);
    setHint(parsed.hint || sc.opener);
    transcriptRef.current = [{ role: avatarNameRef.current, text: parsed.german }];
    avatarTalk(parsed.german, parsed.erklarung);
  };

  /* ---------- student turn ---------- */
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
        transcriptRef.current.push({ role: avatarNameRef.current, text: parsed.german });
        avatarTalk(parsed.german, parsed.erklarung);
      } catch {
        setThinking(false);
      }
    },
    [history, callAI, avatarTalk]
  );

  handleStudentRef.current = handleStudent;

  /* ---------- end session ---------- */
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
          topic: scenario?.title ?? "conversation",
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
  }, [level, scenario]);

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

  const changeAvatar = (k: string) => {
    setAvatarKey(k);
    storeAvatar(k);
  };

  /* ================= SCREENS ================= */

  /* ----- scenario & avatar picker ----- */
  if (phase === "select" || needsKey) {
    const filtered = SCENARIOS.filter((s) => s.category === category);
    return (
      <main className="min-h-screen px-4 md:px-10 py-8 max-w-6xl mx-auto w-full">
        <Link href="/practice" className="text-sm opacity-70 hover:opacity-100">← Back</Link>

        <div className="text-center mt-4 mb-6">
          <h1 className="text-3xl md:text-5xl font-extrabold">🗣️ Conversation Scenarios</h1>
          <p className="opacity-70 mt-2">Pick a real-life situation → talk in German → get corrected on the spot.</p>
        </div>

        {needsKey && (
          <div className="glass rounded-3xl p-8 mb-8 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-3">⚡ Scenarios need the free AI key — 2 minute setup</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm opacity-90 leading-relaxed">
              <li>Go to <a className="text-amber-400 underline" href="https://console.groq.com" target="_blank" rel="noreferrer">console.groq.com</a> → sign in with Google (free, no card)</li>
              <li>"API Keys" → "Create API Key" → copy it</li>
              <li>Create <code className="bg-white/10 px-2 py-0.5 rounded">.env.local</code> in the project folder with:<br />
                <code className="bg-white/10 px-2 py-0.5 rounded block mt-1">GROQ_API_KEY=gsk_your_key_here</code></li>
              <li>Restart the dev server: <code className="bg-white/10 px-2 py-0.5 rounded">npm run dev</code></li>
            </ol>
            <button onClick={() => setNeedsKey(false)} className="btn-ghost text-sm mt-5">← Back to scenarios</button>
          </div>
        )}

        {/* avatar picker */}
        <div className="glass rounded-3xl p-4 mb-6 max-w-2xl mx-auto">
          <div className="text-xs font-bold tracking-widest text-center opacity-60 mb-2">CHOOSE YOUR PARTNER 🎭</div>
          <AvatarPicker value={avatarKey} onChange={changeAvatar} filter={["anna", "markus", "lena", "raj"]} />
        </div>

        {/* level chips */}
        <div className="flex gap-2 justify-center mb-6 flex-wrap">
          <span className="text-sm opacity-60 self-center mr-1">Level:</span>
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`px-4 h-9 rounded-xl font-extrabold text-sm transition-all ${
                level === l ? "german-gradient scale-105 text-black shadow-lg" : "glass opacity-60 hover:opacity-100"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* category tabs */}
        <div className="flex gap-2 justify-start md:justify-center mb-6 overflow-x-auto pb-2">
          {SCENARIO_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-2 text-sm whitespace-nowrap transition-all ${
                category === c ? "german-gradient font-bold text-black" : "glass hover:border-amber-400/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* scenario cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => startScenario(s, avatarKey)}
              disabled={thinking}
              className="glass rounded-2xl p-5 text-left hover:scale-[1.02] hover:border-amber-400/50 transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-3xl">{s.icon}</span>
                <span className={`${SCENARIO_LEVEL_COLORS[s.level]} text-black text-[11px] font-extrabold px-2 py-0.5 rounded-full`}>
                  {s.level}
                </span>
              </div>
              <div className="font-bold group-hover:text-amber-300 transition-colors">{s.title}</div>
              <p className="text-xs opacity-65 mt-1 leading-snug">{s.description}</p>
              {thinking && scenario?.id === s.id && (
                <p className="text-xs text-amber-300 mt-2 animate-pulse">Starting…</p>
              )}
            </button>
          ))}
        </div>
      </main>
    );
  }

  /* ----- feedback ----- */
  if (phase === "feedback") {
    return (
      <main className="min-h-screen flex flex-col items-center px-6 py-10 max-w-3xl mx-auto w-full">
        <Link href="/practice" className="absolute top-6 left-6 text-sm opacity-70 hover:opacity-100">← Back</Link>
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📋</div>
          <h1 className="text-3xl font-extrabold">Session Report</h1>
          <p className="text-sm opacity-60 mt-1">{scenario?.icon} {scenario?.title} • Level {level}</p>
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
            {[["💪 Strengths", feedback.strengths], ["🔧 To improve", feedback.mistakes], ["📚 Vocabulary", feedback.vocab], ["🎯 Next step", feedback.next]].map(([t, b]) =>
              b ? (
                <div key={t} className="text-left">
                  <div className="font-bold mb-1">{t}</div>
                  <p className="text-sm opacity-85 leading-relaxed whitespace-pre-line">{b}</p>
                </div>
              ) : null
            )}
          </div>
        ) : (
          <div className="glass rounded-3xl p-8 w-full text-center opacity-80">Could not generate the report. Try again.</div>
        )}
        <div className="flex gap-4 mt-8">
          <button onClick={() => { setPhase("select"); setMsgs([]); setHistory([]); transcriptRef.current = []; }} className="btn-primary">
            🗺️ Pick another scenario
          </button>
          <Link href="/practice/lehrer" className="btn-ghost">👨‍🏫 Lehrer mode</Link>
        </div>
      </main>
    );
  }

  /* ----- chat ----- */
  return (
    <main className="min-h-screen flex flex-col px-4 md:px-8 py-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4 gap-2">
        <button onClick={() => { stopSpeaking(); setSpeaking(false); setPhase("select"); }} className="text-sm opacity-70 hover:opacity-100 shrink-0">
          ← Scenarios
        </button>
        <div className="text-center">
          <div className="font-extrabold text-lg">{scenario?.icon} {scenario?.title}</div>
          <div className="text-xs opacity-60">with {avatarNameRef.current} • Level {level}</div>
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
            <div className="text-sm opacity-70 animate-pulse">Thinking… 🤔</div>
          )}
          {hint && !listening && (
            <div className="w-full text-left bg-amber-400/10 border border-amber-400/30 rounded-xl px-3 py-2">
              <div className="text-[10px] font-bold tracking-widest text-amber-300 mb-1">💡 HINT</div>
              <p className="text-sm leading-snug">{hint}</p>
            </div>
          )}
          {speaking && (
            <button onClick={() => { stopSpeaking(); setSpeaking(false); autoMic(); }} className="text-xs glass rounded-full px-3 py-1.5 hover:bg-white/10">
              ⏭️ Skip voice
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col glass rounded-3xl p-4 md:p-6 min-h-[55vh]">
          <div className="flex-1 overflow-y-auto pr-1 mb-4 max-h-[52vh]">
            <ChatList messages={msgs} avatarColor="bg-red-600/80" />
            <div ref={chatEndRef} />
          </div>

          <div className="flex flex-col items-center gap-5 pt-2 border-t border-white/10">
            <MicButton listening={listening} disabled={thinking} onClick={onMic} />
            <div className="flex w-full gap-2 mt-2">
              <input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendText()}
                placeholder="…or type in German here (e.g. Ich möchte einen Kaffee)"
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
