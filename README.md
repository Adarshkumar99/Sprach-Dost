# SprachDost

**India will speak German.** 🇩🇪

An AI-powered German speaking coach built for Indian learners — from absolute beginner (A1) to mastery (C2), with Goethe/TELC exam preparation.

---

## About

Most German learners in India complete months of coaching yet freeze when they have to actually *speak*. SprachDost fixes that with always-available AI avatar partners you can have real voice conversations with — in German — with instant corrections and simple English explanations.

## Features

### Conversation Mode — Anna & Friends
- **55 real-life role-play scenarios** across 8 categories: Food & Drink, Travel, Daily Life, Work & Study, Health & Help, Social, Shopping, Exam Prep
- Goethe A1/A2 speaking-exam mock scenarios (Teil 1–3 formats)
- Real-time voice conversation: the avatar speaks German out loud, listens to your answer, and corrects you
- Live speech transcript while you talk

### Teacher Mode — Lehrer
- You choose the topic, the teacher builds the lesson: grammar rules first, examples next, practice last
- Level-aware teaching (A1 → C2)
- Structured curriculum engine for A1 and A2: 22 topics, 270+ core vocabulary items with articles and grammar maps
- Detailed correction feedback after every reply

### Feedback Reports
- End-of-session report: score, strengths, mistakes with corrections, vocabulary learned, and next steps

### Avatars
- 6 selectable characters (Anna, Markus, Lena, Raj, Sophie, Jonas) with distinct looks and male/female voices
- Preference saved across sessions

### Technical details
- Voice synthesis & recognition via the browser Web Speech API (German + English voices, no cost)
- AI conversations via Groq (Llama 3.3) with scripted graceful degradation when no key is configured
- CEFR level selection per session (A1–C2)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Speech I/O | Web Speech API (SpeechSynthesis + SpeechRecognition) |
| LLM | Groq API — `llama-3.3-70b-versatile` (free tier) |
| Avatars | Hand-built animated SVG with lip-sync |

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — best in Chrome or Edge (microphone + German voices).

Environment (optional, enables AI modes):

```
GROQ_API_KEY=your_key_here
```

## Roadmap

- [x] Landing page, waitlist, pricing section
- [x] 55 scenario voice conversations with feedback reports
- [x] Topic-based teacher mode with level selection (A1–C2)
- [x] 6 avatars with lip-sync
- [ ] Auth + progress tracking (Supabase)
- [ ] Vocabulary lists + spaced repetition
- [ ] PWA install / Play Store (Capacitor)
- [ ] Pro tier (unlimited sessions, pronunciation scoring, neural voices)

---

Built for Indian German learners. *Sprichst du schon Deutsch? Jetzt schon.*
