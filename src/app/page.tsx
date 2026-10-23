import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";
import AuthButton from "@/components/AuthButton";
import HeroGlobe from "@/components/HeroGlobe";

export default function Home() {
  return (
    <main className="flex flex-col">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5">
        <div className="text-2xl font-extrabold tracking-tight">
          <span className="text-amber-400">Sprach</span>
          <span className="text-red-500">Dost</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium opacity-90">
          <Link href="/practice/anna" className="hover:text-amber-400 transition-colors">Anna 🗣️</Link>
          <Link href="/practice/lehrer" className="hover:text-amber-400 transition-colors">Lehrer 👨‍🏫</Link>
          <Link href="/vocab" className="hover:text-amber-400 transition-colors">Vocab 📇</Link>
          <Link href="/grammar" className="hover:text-amber-400 transition-colors">Grammar 📐</Link>
          <Link href="/stories" className="hover:text-amber-400 transition-colors">Stories 📖</Link>
          <Link href="/placement" className="hover:text-amber-400 transition-colors">Placement 🧭</Link>
          <Link href="/practice" className="hover:text-amber-400 transition-colors">Features ✨</Link>
          <a href="#pricing" className="hover:text-amber-400 transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <AuthButton />
          <Link href="/practice" className="btn-primary !py-2 !px-5 text-sm">
            Start Free
          </Link>
        </div>
      </nav>
      {/* mobile nav — links are hidden above on small screens, this row keeps them reachable */}
      <div className="md:hidden flex gap-2 px-6 pb-3 overflow-x-auto">
        {[
          ["Anna", "/practice/anna", "🗣️"],
          ["Lehrer", "/practice/lehrer", "👨‍🏫"],
          ["Vocab", "/vocab", "📇"],
          ["Grammar", "/grammar", "📐"],
          ["Stories", "/stories", "📖"],
          ["Placement", "/placement", "🧭"],
          ["Features", "/practice", "✨"],
          ["Exam", "/practice/exam", "🎓"],
          ["Speak", "/pronounce", "🔊"],
        ].map(([label, href, icon]) => (
          <Link key={href} href={href} className="glass rounded-full px-4 py-2 text-sm whitespace-nowrap hover:border-amber-400/50">
            {icon} {label}
          </Link>
        ))}
      </div>

      {/* HERO */}
      <section className="relative flex flex-col-reverse md:flex-row items-center justify-between gap-10 px-6 md:px-12 xl:px-24 py-14 md:py-20 md:min-h-[84vh] overflow-hidden">
        <div className="relative max-w-xl text-center md:text-left">
          <div className="hero-line-in inline-block glass rounded-full px-4 py-1 text-xs font-semibold mb-5 tracking-wider" style={{ animationDelay: "0.05s" }}>
            100% FREE to start • No card needed
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
            <span className="hero-line-in block" style={{ animationDelay: "0.15s" }}>
              Your German
            </span>
            <span className="hero-line-in block" style={{ animationDelay: "0.28s" }}>
              speaking partner —{" "}
            </span>
            <span className="german-gradient bg-clip-text text-transparent">
              {"anytime, anywhere.".split("").map((ch, i) => (
                <span
                  key={i}
                  className="letter-pop"
                  style={{ animationDelay: `${0.45 + i * 0.035}s` }}
                >
                  {ch === " " ? "\u00A0" : ch}
                </span>
              ))}
            </span>
          </h1>
          <p className="hero-line-in mt-5 text-lg opacity-80 leading-relaxed" style={{ animationDelay: "0.55s" }}>
            Talk with Anna, learn from Lehrer — German speaking practice from <b>A1 to C2</b> with
            voice-enabled avatar teachers. Real voice, real corrections, simple English explanations.
            Grammar, vocabulary and Goethe exam prep — all in one place.
          </p>
          <div className="hero-line-in mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start" style={{ animationDelay: "0.7s" }}>
            <Link href="/practice/lehrer" className="btn-primary text-center">
              👨‍🏫 Learn with Lehrer
            </Link>
            <Link href="/practice/anna" className="btn-ghost text-center">
              🗣️ Talk with Anna
            </Link>
          </div>
          <p className="hero-line-in mt-4 text-xs opacity-60" style={{ animationDelay: "0.85s" }}>
            Best in Chrome / Edge • Microphone permission needed • No signup, no card
          </p>
        </div>
        <div className="hero-line-in relative w-full md:w-[560px] lg:w-[680px] xl:w-[760px] md:-mr-20 lg:-mr-32 shrink-0" style={{ animationDelay: "0.3s" }}>
          <HeroGlobe />
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 md:px-12 xl:px-24 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
          You learn by <span className="text-amber-400">speaking</span>
        </h2>
        <p className="text-center opacity-70 max-w-2xl mx-auto mb-12">
          Most courses make you cram grammar for months. SprachDost puts you in real voice
          conversations from day one — the avatar talks to you in German and explains in simple English.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: "🗣️", title: "Anna — 55 Scenarios", desc: "Real-life situations: café, airport, hotel, job interview, bargaining, emergencies. Gentle real-time corrections while you speak." },
            { icon: "👨‍🏫", title: "Lehrer — Teach me a topic", desc: "YOU choose the topic — 'der-die-das', job interview, travel. Lehrer teaches natively and gives detailed feedback." },
            { icon: "📇", title: "4,500+ Flashcards", desc: "A1 (1,000) • A2 (1,500) • B1 (2,000) words with 3D flip cards, audio and spaced repetition — words come back right before you forget them." },
            { icon: "📐", title: "Grammar — 1,000+ Questions", desc: "The complete Goethe syllabus A1, A2 and B1: short English lessons, declension tables, then quizzes with instant explanations." },
            { icon: "📝", title: "Feedback Report", desc: "After every session: your score, mistakes, new vocabulary and a plan for the next step." },
            { icon: "📖", title: "Story Time", desc: "Short German stories with English under every paragraph — then vocab from the story plus a 5-question comprehension quiz. 🔊 per paragraph." },
            { icon: "🧭", title: "Placement Test", desc: "45 quick questions and we pinpoint your level (A1–B1) — so you start exactly where you should, not from zero." },
          ].map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6 hover:scale-[1.02] transition-transform">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-bold mb-2">{f.title}</h3>
              <p className="text-sm opacity-75 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LEVELS A1–C2 */}
      <section id="levels" className="px-6 md:px-12 xl:px-24 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">The road from A1 to C2</h2>
        <p className="text-center opacity-70 mb-10">Covered for Goethe / TELC / TestDaF exam levels</p>
        <div className="flex flex-col md:flex-row gap-3 max-w-4xl mx-auto mb-10">
          {[
            { lvl: "A1", name: "Survival", desc: "Greetings, shopping, introductions", cls: "lvl-a1" },
            { lvl: "A2", name: "Basics+", desc: "Daily routine, past tense, appointments", cls: "lvl-a2" },
            { lvl: "B1", name: "Independent", desc: "Opinions, travel, Goethe B1 exam", cls: "lvl-b1" },
            { lvl: "B2", name: "Fluent", desc: "Work talk, interviews, debates", cls: "lvl-b2" },
            { lvl: "C1", name: "Advanced", desc: "University + professional German", cls: "lvl-c1" },
            { lvl: "C2", name: "Mastery", desc: "Near-native, TestDaF level", cls: "lvl-c2" },
          ].map((l) => (
            <div key={l.lvl} className="glass rounded-xl overflow-hidden flex-1">
              <div className={`${l.cls} text-black font-extrabold text-center py-2 text-lg`}>{l.lvl}</div>
              <div className="p-3">
                <div className="font-semibold text-sm">{l.name}</div>
                <div className="text-xs opacity-70 mt-1">{l.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6 text-center">
          {[
            { n: "1", t: "Pick your avatar", d: "Anna (conversation) or Lehrer (topic teaching)" },
            { n: "2", t: "Speak in German 🎤", d: "Tap start, talk naturally — the avatar listens, speaks back and corrects you" },
            { n: "3", t: "Get feedback 📋", d: "At the end of each session: score + mistakes + new vocabulary" },
          ].map((s) => (
            <div key={s.n} className="glass rounded-2xl p-6">
              <div className="w-10 h-10 mx-auto rounded-full german-gradient flex items-center justify-center font-extrabold mb-3">{s.n}</div>
              <h4 className="font-bold mb-1">{s.t}</h4>
              <p className="text-sm opacity-70">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 md:px-12 xl:px-24 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Simple, student-friendly pricing</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <div className="glass rounded-2xl p-8">
            <div className="text-sm font-bold tracking-wider text-amber-400 mb-1">FREE</div>
            <div className="text-4xl font-extrabold mb-4">₹0</div>
            <ul className="space-y-2 text-sm opacity-85 mb-8">
              <li>✅ Both avatars — Anna &amp; Lehrer</li>
              <li>✅ Voice conversations (daily limit)</li>
              <li>✅ A1–A2 curriculum + 4,500-word flashcard trainer</li>
              <li>✅ Basic feedback</li>
            </ul>
            <Link href="/practice" className="btn-ghost block text-center">Start now — free</Link>
          </div>
          <div className="rounded-2xl p-8 border-2 border-amber-400/60 relative glass">
            <div className="absolute -top-3 right-6 german-gradient text-xs font-bold px-3 py-1 rounded-full">LIVE</div>
            <div className="text-sm font-bold tracking-wider text-amber-400 mb-1">PRO</div>
            <div className="text-4xl font-extrabold mb-4">₹500<span className="text-lg font-normal opacity-70">/mo</span></div>
            <ul className="space-y-2 text-sm opacity-85 mb-8">
              <li>⭐ Unlimited AI conversations</li>
              <li>⭐ AI exam grading with CEFR rubric</li>
              <li>⭐ Career packs: Nursing · IT · Ausbildung</li>
              <li>⭐ Branching role-play stories</li>
              <li>⭐ Cloud sync on every device</li>
            </ul>
            <Link href="/pro" className="btn-primary block text-center">Upgrade to Pro →</Link>
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section id="waitlist" className="px-6 md:px-12 xl:px-24 py-16 text-center">
        <h2 className="text-3xl font-bold mb-3">Don&apos;t wait for Pro 😄</h2>
        <p className="opacity-70 mb-8">The free version is live right now — and join the waitlist for early Pro access.</p>
        <WaitlistForm />
      </section>

      {/* FREE LEARNING RESOURCES (SEO) */}
      <section className="px-6 md:px-12 xl:px-24 py-14 border-t border-white/10">
        <h2 className="text-2xl font-bold mb-6 text-center">Free German learning resources</h2>
        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <Link href="/woerterbuch" className="glass rounded-2xl p-5 hover:border-amber-400/40 transition-all">
            <div className="font-bold mb-1">📚 German Vocabulary A1–C1</div>
            <p className="text-xs opacity-60">Every word with article, meaning & example — listen free.</p>
          </Link>
          <Link href="/grammatik" className="glass rounded-2xl p-5 hover:border-amber-400/40 transition-all">
            <div className="font-bold mb-1">📐 Grammar Lessons A1–C1</div>
            <p className="text-xs opacity-60">Goethe syllabus explained in simple English + practice questions.</p>
          </Link>
          <Link href="/lesen" className="glass rounded-2xl p-5 hover:border-amber-400/40 transition-all">
            <div className="font-bold mb-1">📖 Reading Practice</div>
            <p className="text-xs opacity-60">Short German stories with English under every line.</p>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-white/10 px-6 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm opacity-60">
        <div>
          <span className="text-amber-400 font-bold">Sprach</span>
          <span className="text-red-500 font-bold">Dost</span> — your German speaking partner
        </div>
        <div className="flex gap-4">
          <Link href="/grammatik" className="hover:text-amber-400">Grammar</Link>
          <Link href="/woerterbuch" className="hover:text-amber-400">Vocabulary</Link>
          <Link href="/lesen" className="hover:text-amber-400">Stories</Link>
          <Link href="/pro" className="hover:text-amber-400">Pro</Link>
        </div>
        <div>Built with ❤️ for German learners • A1–C2 • Goethe ready</div>
      </footer>
    </main>
  );
}
