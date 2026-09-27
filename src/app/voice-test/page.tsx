"use client";

import { useState } from "react";

/**
 * Automatic voice diagnostic page.
 * One button → runs the full speechSynthesis test → POSTS results to the server
 * so we can read them from the terminal and know EXACTLY where audio dies.
 */
export default function VoiceTest() {
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [final, setFinal] = useState("");

  const log = (s: string) => setLines((l) => [...l, s]);

  const runTest = async () => {
    setRunning(true);
    setLines([]);
    setFinal("");
    const report: Record<string, unknown> = {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    // 1. API supported?
    const supported = "speechSynthesis" in window;
    report.apiSupported = supported;
    log(`1. speechSynthesis API: ${supported ? "✅ supported" : "❌ NOT SUPPORTED"}`);
    if (!supported) {
      report.verdict = "API_MISSING";
      await send(report);
      setFinal("❌ Browser does not support speechSynthesis at all.");
      setRunning(false);
      return;
    }

    const synth = window.speechSynthesis;

    // 2. Voices
    let voices = synth.getVoices();
    if (voices.length === 0) {
      await new Promise((r) => setTimeout(r, 1200));
      voices = synth.getVoices();
    }
    report.voiceCount = voices.length;
    report.voiceNames = voices.slice(0, 12).map((v) => `${v.name} [${v.lang}]${v.localService ? "" : " (network)"}`);
    const deVoice = voices.find((v) => v.lang.toLowerCase().startsWith("de"));
    report.germanVoice = deVoice ? `${deVoice.name} [${deVoice.lang}]${deVoice.localService ? "" : " (network)"}` : "NONE";
    log(`2. Voices loaded: ${voices.length} | German voice: ${report.germanVoice}`);
    log(`   First voices: ${(report.voiceNames as string[]).join(", ")}`);

    // 3. Speak a test line and watch events
    const text = "Hallo! Ich bin Anna.";
    report.testText = text;
    log(`3. Speaking: "${text}" …`);

    const result = await new Promise<string>((resolve) => {
      let started = false;
      const t0 = Date.now();
      const utter = new SpeechSynthesisUtterance(text);
      if (deVoice) utter.voice = deVoice;
      utter.lang = "de-DE";
      utter.rate = 0.92;
      utter.volume = 1;

      utter.onstart = () => {
        started = true;
        log(`   ▶ onstart fired after ${Date.now() - t0}ms (audio is PLAYING 🔊)`);
      };
      utter.onend = () => {
        log(`   ⏹ onend fired after ${Date.now() - t0}ms`);
        resolve(started ? "STARTED_AND_ENDED" : "ENDED_WITHOUT_START (impossible-ish)");
      };
      utter.onerror = (e: any) => {
        const err = e?.error || "unknown";
        log(`   ❌ onerror: ${err} after ${Date.now() - t0}ms`);
        resolve("ERROR: " + err);
      };

      synth.speak(utter);
      try { synth.resume(); } catch {}

      // watchdog
      setTimeout(() => {
        if (started) resolve("STARTED_BUT_NEVER_ENDED");
        else resolve("NEVER_STARTED (silent queue — Chrome TTS blocked/dead)");
      }, 6000);
    });

    report.speakResult = result;
    log(`4. Result: ${result}`);

    // 4. Verdict
    let verdict: string;
    if (result === "STARTED_AND_ENDED") {
      verdict = "✅ TTS engine WORKS — audio played. If you heard nothing, it's a SOUND ROUTING issue (wrong output device / Chrome muted), NOT code.";
    } else if (result === "STARTED_BUT_NEVER_ENDED") {
      verdict = "⚠️ Audio STARTED but never ended — Chrome network-voice hang. English voices may be affected; try system voices.";
    } else if (result.startsWith("ERROR")) {
      verdict = `❌ Chrome reported an error: ${result}`;
    } else {
      verdict = "❌ Chrome queued the utterance but NEVER started it. Classic silent-TTS bug. Likely fix: toggle chrome://flags, restart Chrome, or the system Speech setting is off.";
    }
    report.verdict = verdict;
    setFinal(verdict);

    await send(report);
    setRunning(false);
  };

  const send = async (report: Record<string, unknown>) => {
    try {
      await fetch("/api/debug-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      log("5. 📨 Report saved to server (developer can read it now)");
    } catch {
      log("5. ❌ Could not save report to server");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-14 max-w-2xl mx-auto w-full">
      <h1 className="text-3xl font-extrabold mb-2">🔬 Voice Engine Diagnostic</h1>
      <p className="opacity-70 text-center mb-8 text-sm">
        Is page pe test chalega aur result automatic server pe save hoga.
      </p>

      <button
        onClick={runTest}
        disabled={running}
        className="btn-primary text-lg !px-10 disabled:opacity-40"
      >
        {running ? "Testing… listen for your speakers 👂" : "▶ Run Voice Test"}
      </button>

      {lines.length > 0 && (
        <div className="glass rounded-2xl p-6 w-full mt-8 font-mono text-xs leading-relaxed">
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}

      {final && (
        <div className={`mt-6 rounded-2xl p-5 w-full text-sm font-semibold ${final.startsWith("✅") ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-300" : "bg-red-500/15 border border-red-400/40 text-red-300"}`}>
          {final}
        </div>
      )}
    </main>
  );
}
