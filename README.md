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

### Vocabulary Trainer
- **4,500+ words**: A1 (1,000) • A2 (1,500) • B1 (2,000), each with meaning, example sentence and 🔊 audio
- Continuous deck — no artificial batching. Progress saves after every card; continue where you left off or reshuffle anytime
- 3D flip flashcards with swipe-to-grade gestures, slow/normal audio toggle
- Spaced repetition engine (SM-2 style): cards resurface right before you forget them

### Grammar Lessons
- **Complete Goethe syllabus**: 30 topics per level (A1/A2/B1) — from der/die/das to Konjunktiv II
- **1,080 quiz questions** (MCQ) with instant right/wrong + a one-line explanation for every answer
- Lessons written in simple English with German examples and declension tables

### Accounts & Sync (optional)
- Email/password + Google login via Supabase (free tier)
- Logged-in users: vocab progress, SRS state, grammar scores and streak sync across devices
- Guests still get full local persistence on their device — no forced login
- Setup: copy `.env.local.example`, add `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, run `supabase/schema.sql` once in the SQL Editor

### Feedback Reports
- End-of-session report: score, strengths, mistakes with corrections, vocabulary learned, and next steps

### Avatars
- 6 selectable characters (Anna, Markus, Lena, Raj, Sophie, Jonas) with distinct looks and male/female voices
- Preference saved across sessions

### Technical details
- Voice synthesis & recognition via the browser Web Speech API (German + English voices, no cost)
- Optional premium neural voices via ElevenLabs — the client falls back to free browser voices automatically
- AI conversations via Groq with automatic model fallback
- CEFR level selection per session (A1–C2)
- Local progress tracking: sessions, practice minutes, day streak, words learned
- Installable as a PWA (Add to Home Screen)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Speech I/O | Web Speech API (free) + optional ElevenLabs neural voices |
| LLM | Groq API with model fallback |
| Avatars | Hand-built animated SVG with lip-sync |
| Distribution | PWA (manifest + standalone display) |

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
- [x] Local progress tracking (sessions, streak, words learned)
- [x] PWA manifest (installable on phones)
- [x] Optional neural voice layer with free fallback
- [x] 4,500+ word flashcard trainer (A1/A2/B1) with 3D flip + spaced repetition + resume
- [x] Grammar lessons — full Goethe A1/A2/B1 syllabus with 1,080 quiz questions
- [x] Auth + cloud progress sync (Supabase, optional — app works offline too)
- [ ] Quiz mode (4-choice) on flashcards + word-of-the-day push
- [ ] Play Store wrapper (Capacitor)
- [ ] Pro tier (unlimited sessions, pronunciation scoring)

---

Built for Indian German learners. *Sprichst du schon Deutsch? Jetzt schon.*
