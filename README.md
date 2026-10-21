# SprachDost

**India will speak German.** 🇩🇪

An AI-powered German speaking coach built for Indian learners — from absolute beginner (A1) to mastery (C2), with Goethe/TELC exam preparation.

---

## About

Most German learners in India complete months of coaching yet freeze when they have to actually *speak*. SprachDost fixes that with always-available AI avatar partners you can have real voice conversations with — in German — with instant corrections and simple English explanations.

## Features

### Conversation Mode — Anna & Friends
- **79 real-life role-play scenarios** across 8 categories: Food & Drink, Travel, Daily Life, Work & Study, Health & Help, Social, Shopping, Exam Prep
- **Career packs** for Indian professionals: 🧑‍⚕️ Nursing in Germany, 💻 IT Workplace, 🛠️ Ausbildung & Visa (8 scenarios each)
- **Branching stories**: most scenarios play out as a decision-tree — your answers steer the story (handle a step well → the plot moves on; struggle → a detour), with a live situation banner
- Goethe A1/A2 speaking-exam mock scenarios (Teil 1–3 formats)
- Real-time voice conversation: the avatar speaks German out loud, listens to your answer, and corrects you
- Live speech transcript while you talk

### Teacher Mode — Lehrer
- You choose the topic, the teacher builds the lesson: grammar rules first, examples next, practice last
- Level-aware teaching (A1 → C2)
- Structured curriculum engine for A1 and A2: 22 topics, 270+ core vocabulary items with articles and grammar maps
- Detailed correction feedback after every reply

### Vocabulary Trainer
- **A1 → C1** (levels generated incrementally): each word with meaning, example sentence and 🔊 audio
- Continuous deck — no artificial batching. Progress saves after every card; continue where you left off or reshuffle anytime
- 3D flip flashcards with swipe-to-grade gestures, slow/normal audio toggle
- Spaced repetition engine (SM-2 style): cards resurface right before you forget them

### Grammar Lessons
- **Complete Goethe syllabus A1 → C1**: 30 topics per level — from der/die/das to Konjunktiv I and nominal style
- **Deep question banks** (target 300/topic, generated incrementally — safe to re-run `npm run gen:grammar` to top up); each quiz samples 20 at random so every attempt is fresh
- **Spaced repetition on topics**: strong quizzes come back later, weak ones sooner (🔁 badge = due for review)
- Instant right/wrong + a one-line explanation for every answer
- Lessons written in simple English with German examples and declension tables

### Story Time
- **Short stories per level (A1 → C1)**, each: German paragraph with English right under it, 8–12 vocab words from the story, and a 5-question comprehension quiz
- 🔊 one-tap audio per paragraph
- Read state saved + synced; `npm run gen:stories` tops up the library anytime (resumable)

### Schreibtrainer — Writing Practice
- Goethe-style email/postcard tasks (A1–B1, all three exam flavours)
- AI examiner grades /15 with task fulfilment, grammar fixes and a fully corrected version
- Attempt history saved + synced

### Fehlerheft — Mistake Notebook
- Every correction from Anna, Lehrer and the AI exam grader is collected automatically
- Review list with 🔊 audio, spaced-repetition quick quiz (Again / Hard / Got it), mark as learned
- Syncs with your account

### Word of the Day
- A fresh word every day (IST), picked from the whole bank, with audio and example sentence
- One tap to train it in the flashcard deck
- **Push notification** every morning (6 AM IST) — VAPID web push via service worker + Vercel cron (`vercel.json`)

### Exam Simulator + Test Series
- **Fixed Modelltests**: Goethe, telc and ÖSD formats × A1/A2/B1 — free for everyone
- **Test Series**: 50 full Goethe-style mocks per level (A1–B2); tests 1–10 free, 11–50 Pro
- Every mock: Lesen (reading MCQs) + Hören (TTS audio, max 3 replays) auto-scored; Schreiben + Sprechen graded by an AI examiner (score /15, corrected text, rubric 1–5 + CEFR estimate)
- Per-test best scores + attempt history saved locally and synced when logged in

### Shareable score cards
- After any mock: "Share your score" → public `/r/<id>` page with a branded card + dynamic OG image
- WhatsApp/Twitter previews show the score card itself — every share brings new visitors

### Analytics
- **Exam readiness %** + skill-wise trend charts (Lesen/Hören/Schreiben/Sprechen)
- Weak areas ranked, grammar best scores per level, SRS learned/due counters

### Grammar Review Session
- SRS-driven 10-minute refresher: due topics → lesson recap → mixed questions → re-graded

### Public SEO pages (10,000+ indexable)
- **/woerterbuch** — every vocab word (A1–C1) with article, meaning, example + audio (on-demand ISR)
- **/grammatik** — all grammar lessons with interactive question teasers
- **/lesen** — every story's first lines free with audio, full story in the app
- Auto `sitemap.xml` + `robots.txt`; internal linking + register CTAs everywhere

### Pronunciation Trainer
- Listen → repeat → instant ✅/🔁 feedback with streak tracking, powered by the same Web Speech API (English/German aware)

### Weekly Challenges
- Four goals reset every Monday: 30 new words • 60 min practice • 5 stories • 10 dictations
- Progress bar on the practice hub, streak badge, synced if logged in
- **Streak shields** 🛡️: 1 new shield every Monday (max 2) — a missed day burns a shield instead of your streak
- Day boundaries use IST, so late-night practice counts for the right day

### Weekly Leaderboard
- XP board for the current ISO week (words ×2 + minutes + stories ×10 + dictations ×3)
- Top 20 + your own rank; requires login (Supabase `weekly_scores` + `profiles` tables)

### Diktat — Dictation Trainer
- Hear a German sentence (level-filtered word bank) → type exactly what you hear
- Word-level diff with green/red feedback, max 3 replays
- Accuracy maps to an SRS grade so dictation feeds your flashcard deck

### Placement Test
- **45 tap-to-answer questions** (A1 → A2 → B1, rising difficulty) that recommend your starting level in ~5 minutes, no typing

### Accounts & Sync (optional)
- Email/password + Google login via Supabase (free tier)
- Logged-in users: vocab progress, SRS state, grammar scores and streak sync across devices
- Guests still get full local persistence on their device — no forced login
- Setup: copy `.env.local.example`, add `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, run `supabase/schema.sql` once in the SQL Editor (re-run after updates — it's idempotent; adds `profiles` + `weekly_scores` for the leaderboard)

### Feedback Reports
- End-of-session report: score, strengths, mistakes with corrections, vocabulary learned, and next steps

### Avatars
- 6 selectable characters (Anna, Markus, Lena, Raj, Sophie, Jonas) with distinct looks and male/female voices
- Preference saved across sessions

### Pro tier (Stripe)
- ₹500/mo: unlimited AI conversations (free: 12/day anonymous, 40/day logged-in), AI exam grading, career packs, cloud sync
- Stripe Checkout + billing portal; webhook keeps `profiles.is_pro` in sync
- Setup: add `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (see `.env.local.example`), re-run `supabase/schema.sql`

### Android app (Capacitor)
- The Android WebView loads the **deployed site** directly (no static export), so all API routes keep working
- Setup: set `CAP_SERVER_URL` in `.env.local` → `npm run cap:sync` → `npm run cap:open` → build APK in Android Studio
- Icons/splash generated from `resources/icon.png` via `@capacitor/assets`

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

## Content generation

The word/story/grammar banks top themselves up automatically every day via GitHub Actions
(`.github/workflows/daily-content.yml`) — no manual runs needed after setup. The branching
story graphs (`src/lib/branches.generated.ts`) top up the same way (`npm run gen:branches`).

1. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `GROQ_API_KEY`, value: your free key from [console.groq.com](https://console.groq.com)
3. Done — every day at 06:00 UTC the generator runs, commits, and pushes new content.
   Manual trigger anytime: **Actions → Daily content top-up → Run workflow**.

Locally you can still force a run: `npm run gen:all`.

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
- [x] Grammar lessons — full Goethe A1–C1 syllabus with deep question banks (~20 sampled per quiz) + spaced repetition on topics
- [x] Vocab quiz mode (MCQ, feeds spaced repetition) + 45-question placement test
- [x] Auth + cloud progress sync (Supabase, optional — app works offline too)
- [x] B2/C1 expansion — vocab, grammar & stories generators cover all five levels (tops up daily)
- [x] Fehlerheft — automatic mistake notebook with SRS re-quiz
- [x] Schreibtrainer — Goethe-style writing tasks with AI grading (/15 + corrected text)
- [x] Word of the Day on the practice hub (push notifications pending)
- [ ] Quiz mode (4-choice) on flashcards + word-of-the-day push notifications
- [x] Play Store wrapper (Capacitor — hosted-URL WebView; Android Studio build needed)
- [x] Pro tier (unlimited sessions via Stripe, AI exam grading, career packs)

---

Built for Indian German learners. *Sprichst du schon Deutsch? Jetzt schon.*
