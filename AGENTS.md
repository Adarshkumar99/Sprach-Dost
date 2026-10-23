# AGENTS.md — notes for coding agents working on SprachDost

## Project
AI German speaking coach for Indian learners (Next.js 16, Groq, Web Speech API, Supabase, PWA + Capacitor).
Read `README.md` first — it documents every feature, the tech stack and setup.

## Commands
- `npm run lint` — ESLint (pre-existing errors exist in anna/lehrer/exam pages: refs-during-render,
  set-state-in-effect, unescaped quotes. Don't "fix" unrelated pre-existing errors in those files;
  keep NEW code clean).
- `npm run build` — typecheck + production build. Run after every change set.
- `npm run dev` — local dev (port 3000).
- `npm run gen:all` — runs vocab + grammar + stories + branches generators (Groq, resumable).

## Groq free-tier rate limits (IMPORTANT)
Generators (scripts/*.mjs) share one free daily token budget and die quietly when exhausted.
They are all **resumable** — re-running fills the gaps, never duplicates. After a rate-limit
exhaustion, RE-RUN the following on the next day (budget resets ~24h later) until output is complete:

**Targets (user-approved 2026-10-21):** vocab B2/C1 = 1500 each (zero cross-level repeats,
normalized dedupe incl. article-stripping + TS seed), grammar = 400 questions/topic on ALL
levels (A1–C1), stories = 100 per level, B2/C1 stories 25–30 paragraphs.

- [ ] Vocab refill after dedupe pass (A1 ~870/1000, A2 ~1118/1500, B1 ~1573/2000, B2/C1 → 1500)
      → `node scripts/generate-vocab.mjs`
- [ ] A2/B1 stories to 100; B2/C1 stories 0→100 (25-30 paras each, 1 story/call)
      → `node scripts/generate-stories.mjs`
- [ ] Grammar to 400/topic everywhere (A2/B1 at 12/topic, B2 24/30 topics, C1 19/30)
      → `node scripts/generate-grammar.mjs`
- [ ] Test series to 50/level (A1–B2, Goethe format) → `public/tests/<LEVEL>.json`
      → `node scripts/generate-tests.mjs` (UI done: 10 free + Pro, per-test best scores)

Estimated free-tier fill time: vocab ~2-3 days, stories ~2-3 days, grammar ~2-4 weeks.
The GitHub Actions workflow (`.github/workflows/daily-content.yml`, 06:00 UTC daily) tops up
everything automatically — locally you only need to re-run if you want content sooner.
If the user buys Groq Developer tier, a single full run can finish grammar in one day.

## Uncommitted work (as of 2026-10-18)
Phases 1–6 are implemented but NOT committed: exam cluster (Goethe/telc/ÖSD + AI grading),
streak shields + IST fix, leaderboard, dictation, career packs, branching stories (79 graphs),
Stripe Pro, Capacitor android/ wrapper, Fehlerheft, Schreibtrainer, Word of the Day, grammar SRS,
B2/C1 expansion. Commit when the user asks.

## Setup status (updated 2026-10-20)
DONE:
- Supabase schema applied via psql (profiles, weekly_scores, push_subscriptions, user_data all live).
- Vercel linked to `sprach-dost` → https://sprach-dost.vercel.app; production env set:
  GROQ_API_KEY, STRIPE_SECRET_KEY (user-added, mode unknown), NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CONTACT, CRON_SECRET.
- CAP_SERVER_URL set locally + android config synced to https://sprach-dost.vercel.app.

STILL BLOCKED — needs user action (ONE item left):
1. ~~Supabase API keys~~ DONE (2026-10-20): fetched via Management API (`npx supabase projects
   api-keys`), set in Vercel production + local .env.local. Auth verified live; push cron works.
2. **Stripe TEST mode is LIVE and fully verified end-to-end** (2026-10-20): signup → checkout
   session (cs_test_...) → signed webhook → profiles.is_pro=true. Test product
   prod_VThniuf2dHGevP, price_1USkOnSBluYB7xx066VnVwLy (₹500/mo), webhook
   we_1USkehSBluYB7xx0530f4L6e. Vercel STRIPE_SECRET_KEY confirmed TEST mode (cs_test session).
3. **Stripe LIVE mode** (when ready for real payments): user enables Products/Prices/Webhooks
   write on the restricted CLI key (mk_1USkIwSBluYB7xx0CWotMmju) or pastes sk_live_ into
   .env.local → then agent creates live product+price+webhook and swaps the 3 env vars.
4. Android: SDK NOT installed on this machine → APK/AAB build happens in Android Studio
   (Node >=22 needed for `cap` CLI:
   `export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"`, then `npm run cap:open`).

## Conventions
- localStorage-first, Supabase `user_data` JSONB sync via `SYNC_KEYS` in `src/lib/supabase.ts`
  (array stores are union-merged by `date`, record stores by higher reps/correct).
- AI prompts live in `src/lib/prompts.ts` with strict `MARKER:` formats parsed in `src/lib/parse.ts`.
- New practice modes: add page under `src/app/…`, card in `src/app/practice/page.tsx`.
- IST day boundaries: use `progress.ts` helpers, never UTC dates for streaks/weeks.
- Free Talk voice mode (`/practice/free-talk`): `/api/chat/stream` (Groq SSE) + sentence-queue
  edge-tts + AnalyserNode VAD barge-in. Shared AI daily limits in `src/lib/aiLimits.ts` (used by
  both /api/chat and /api/chat/stream; "voice" mode included). VAD threshold tuned for speakers
  with echoCancellation — tune `rms > 0.055` / `hotTicks >= 4` if barge-in misfires.
