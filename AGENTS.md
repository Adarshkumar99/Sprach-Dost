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

- [ ] B2 grammar: 24/30 topics (missing: word-order-nachfeld, wortstellung-nachfeld etc. — re-run fills)
      → `ONLY_LEVEL=B2 TARGET_QUESTIONS=40 node scripts/generate-grammar.mjs`
- [ ] C1 grammar: 7/30 topics (modalpartikel-c1 is short at 20/40)
      → `ONLY_LEVEL=C1 TARGET_QUESTIONS=40 node scripts/generate-grammar.mjs`
- [ ] B2 stories: 0/30 → `TARGET_A1=0 TARGET_A2=0 TARGET_B1=0 TARGET_B2=30 TARGET_C1=20 node scripts/generate-stories.mjs`
- [ ] C1 stories: 0/20 (same command as above)
- [ ] B2 vocab at 321/1200, C1 at 226/800 (nice-to-have; daily CI also tops up)
      → `TARGET_A1=0 TARGET_A2=0 TARGET_B1=0 TARGET_B2=1200 TARGET_C1=800 node scripts/generate-vocab.mjs`

The GitHub Actions workflow (`.github/workflows/daily-content.yml`, 06:00 UTC daily) tops up
everything automatically — locally you only need to re-run if you want content sooner.

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

STILL BLOCKED — needs user action (last 2 items):
1. **Supabase API keys** (auth + sync + webhook + push are OFF on the deployed site without
   them): add to Vercel production env → `NEXT_PUBLIC_SUPABASE_URL` (= https://gaokxpbzteagtznwmeiu.supabase.co),
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Settings → API).
   Easiest: user runs `npx supabase login` and tells the agent — keys fetchable via
   Management API. Then redeploy.
2. **Stripe LIVE mode**: the CLI's restricted key (rk_live) lacks product_write on live.
   Either (a) user enables Products/Prices/Webhooks write on that restricted key at
   https://dashboard.stripe.com/b/acct_1OOj5PSBluYB7xx0/apikeys (key mk_1USkIwSBluYB7xx0CWotMmju),
   or (b) user pastes the full `sk_live_...` into `.env.local` as STRIPE_SECRET_KEY.
   Then agent creates live product + ₹500/mo price + webhook endpoint and sets
   `STRIPE_PRICE_ID` + `STRIPE_WEBHOOK_SECRET` in Vercel + verifies the deployed key's mode.
   (Test-mode product prod_VThniuf2dHGevP + price_1USkOnSBluYB7xx066VnVwLy exist for testing.)
3. Android: SDK NOT installed on this machine → APK/AAB build happens in Android Studio
   (Node >=22 needed for `cap` CLI:
   `export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"`, then `npm run cap:open`).

## Conventions
- localStorage-first, Supabase `user_data` JSONB sync via `SYNC_KEYS` in `src/lib/supabase.ts`
  (array stores are union-merged by `date`, record stores by higher reps/correct).
- AI prompts live in `src/lib/prompts.ts` with strict `MARKER:` formats parsed in `src/lib/parse.ts`.
- New practice modes: add page under `src/app/…`, card in `src/app/practice/page.tsx`.
- IST day boundaries: use `progress.ts` helpers, never UTC dates for streaks/weeks.
