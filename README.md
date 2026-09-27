# 🇩🇪 SprachDost — Deutsch bolega India

AI avatar se German bolke seekho — **A1 se C2** tak. Indian learners ke liye: Hinglish explanations, Goethe/TELC exam focus, aur **₹0 running cost**.

## 🎭 The Two Avatars

| Avatar | Mode | Kya karta hai |
|---|---|---|
| **Anna** 🗣️ | `/practice/anna` | Real-life scenario conversations (cafe demo) — gentle corrections, hints |
| **Lehrer** 👨‍🏫 | `/practice/lehrer` | **TUM topic choose karte ho** → wo teach karta hai, discuss karta hai, detailed feedback deta hai |

## 💰 100% Free Tech (no paid anything)

- **Next.js** (Vercel free tier) — frontend + hosting
- **Web Speech API** (browser built-in) — German TTS + German mic input — *unlimited, no key*
- **Groq free tier** (`llama-3.3-70b-versatile`) — AI brain — *no credit card needed*
- Works even **without any API key** — Anna has a full offline scripted demo!

## 🚀 Local Run

```bash
npm install
npm run dev
# open http://localhost:3000
```

**Best browser:** Chrome / Edge (best German voices + mic support). Mic permission allow karna.

## 🔑 AI unlock (optional, 2 min, free)

Anna (dynamic) + Lehrer ke liye:

1. https://console.groq.com → sign up (Google login)
2. API Keys → Create API Key → copy
3. `.env.local` file banao (`.env.local.example` copy karke):
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```
4. `npm run dev` restart

Bina key ke: **Anna offline demo mode chalti hai** — full cafe conversation with voice.

## ☁️ Deploy (Vercel, free)

```bash
# 1. GitHub repo banao, push karo:
git init && git add . && git commit -m "SprachDost MVP"
git remote add origin https://github.com/<you>/sprachdost.git
git push -u origin main

# 2. vercel.com → import repo → Environment Variables mein GROQ_API_KEY
#    add karo → Deploy. Live: sprachdost.vercel.app (custom .in domain later)
```

## 🗺️ Roadmap

- [x] Landing page + waitlist + pricing
- [x] Anna: cafe scenario voice demo (offline + AI)
- [x] Lehrer: topic-based teaching with level select (A1–C2)
- [x] Session-end feedback report
- [ ] Supabase auth + progress/streaks save
- [ ] Vocab import (CSV) + spaced repetition
- [ ] PWA install (Add to Home Screen)
- [ ] ₹199/mo Pro (Razorpay) + unlimited + pronunciation scoring
- [ ] Play Store wrapper (Capacitor) — same code

---

Made with ❤️ in India. *Sprichst du schon Deutsch? Jetzt schon!* 🚀
