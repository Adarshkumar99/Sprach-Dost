import Link from "next/link";
import Avatar from "@/components/Avatar";
import WaitlistForm from "@/components/WaitlistForm";

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
          <a href="#levels" className="hover:text-amber-400 transition-colors">A1–C2</a>
          <a href="#pricing" className="hover:text-amber-400 transition-colors">Pricing</a>
        </div>
        <Link href="/practice" className="btn-primary !py-2 !px-5 text-sm">
          Start Free
        </Link>
      </nav>

      {/* HERO */}
      <section className="flex flex-col-reverse md:flex-row items-center justify-between gap-10 px-6 md:px-12 xl:px-24 py-14 md:py-24">
        <div className="max-w-xl text-center md:text-left">
          <div className="inline-block glass rounded-full px-4 py-1 text-xs font-semibold mb-5 tracking-wider">
            100% FREE to start • Made in India 🇮🇳
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
            India will speak <span className="german-gradient bg-clip-text text-transparent">German</span> 🇩🇪
          </h1>
          <p className="mt-5 text-lg opacity-80 leading-relaxed">
            Talk with Anna, learn from Lehrer — German speaking practice from <b>A1 to C2</b> with
            voice-enabled avatar teachers. Real voice, real corrections, simple English explanations.
            Grammar, vocabulary and Goethe exam prep — all in one place.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Link href="/practice/lehrer" className="btn-primary text-center">
              👨‍🏫 Learn with Lehrer
            </Link>
            <Link href="/practice/anna" className="btn-ghost text-center">
              🗣️ Talk with Anna
            </Link>
          </div>
          <p className="mt-4 text-xs opacity-60">
            Best in Chrome / Edge • Microphone permission needed • No signup, no card
          </p>
        </div>
        <div className="glass rounded-3xl p-8 flex gap-6">
          <Avatar variant="anna" size={180} name="Anna" statusText="Conversation Partner" />
          <div className="hidden sm:block border-l border-white/10" />
          <div className="hidden sm:flex flex-col justify-center">
            <Avatar variant="jonas" size={180} name="Jonas" statusText="Topic Teacher" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 md:px-12 xl:px-24 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
          You learn by <span className="text-amber-400">speaking</span>
        </h2>
        <p className="text-center opacity-70 max-w-2xl mx-auto mb-12">
          Even after spending ₹20,000 on coaching, you rarely get real speaking practice.
          On SprachDost, the avatar actually talks to you in German — and explains in simple English.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: "🗣️", title: "Anna — 55 Scenarios", desc: "Real-life situations: café, airport, hotel, job interview, bargaining, emergencies. Gentle real-time corrections while you speak." },
            { icon: "👨‍🏫", title: "Lehrer — Teach me a topic", desc: "YOU choose the topic — 'der-die-das', job interview, travel. Lehrer teaches natively and gives detailed feedback." },
            { icon: "🎭", title: "6 Avatar partners", desc: "Anna, Markus, Lena, Raj, Sophie, Jonas — each with their own voice. Pick who you vibe with." },
            { icon: "📝", title: "Feedback Report", desc: "After every session: your score, mistakes, new vocabulary and a plan for the next step." },
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
              <li>✅ A1–A2 curriculum</li>
              <li>✅ Basic feedback</li>
            </ul>
            <Link href="/practice" className="btn-ghost block text-center">Start now — free</Link>
          </div>
          <div className="rounded-2xl p-8 border-2 border-amber-400/60 relative glass">
            <div className="absolute -top-3 right-6 german-gradient text-xs font-bold px-3 py-1 rounded-full">COMING SOON</div>
            <div className="text-sm font-bold tracking-wider text-amber-400 mb-1">PRO</div>
            <div className="text-4xl font-extrabold mb-4">₹199<span className="text-lg font-normal opacity-70">/mo</span></div>
            <ul className="space-y-2 text-sm opacity-85 mb-8">
              <li>⭐ Unlimited conversations</li>
              <li>⭐ Full A1–C2 curriculum + exam mocks</li>
              <li>⭐ Word-level pronunciation scoring</li>
              <li>⭐ Custom vocab lists (upload yours)</li>
              <li>⭐ Detailed session reports</li>
            </ul>
            <a href="#waitlist" className="btn-primary block text-center">Get early access</a>
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section id="waitlist" className="px-6 md:px-12 xl:px-24 py-16 text-center">
        <h2 className="text-3xl font-bold mb-3">Don&apos;t wait for Pro 😄</h2>
        <p className="opacity-70 mb-8">The free version is live right now — and join the waitlist for early Pro access.</p>
        <WaitlistForm />
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-white/10 px-6 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm opacity-60">
        <div>
          <span className="text-amber-400 font-bold">Sprach</span>
          <span className="text-red-500 font-bold">Dost</span> — India will speak German 🇮🇳
        </div>
        <div>Built with ❤️ for Indian German learners • A1–C2 • Goethe ready</div>
      </footer>
    </main>
  );
}
