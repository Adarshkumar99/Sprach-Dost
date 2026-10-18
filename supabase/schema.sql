-- SprachDost user progress sync
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: every user only sees their own row
alter table public.user_data enable row level security;

create policy "users read own data"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "users upsert own data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "users update own data"
  on public.user_data for update
  using (auth.uid() = user_id);

-- Google OAuth: Supabase Dashboard → Authentication → Providers → Google
-- (needs OAuth client from Google Cloud Console; redirect URL is shown there)

-- ── Profiles (display name + Pro status) ──
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Learner',
  is_pro boolean not null default false,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

-- add stripe column for pre-existing installs
alter table public.profiles add column if not exists stripe_customer_id text;

alter table public.profiles enable row level security;

create policy "profiles readable by authenticated"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── Weekly leaderboard (one row per user per ISO week) ──
create table if not exists public.weekly_scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_key text not null,
  display_name text not null default 'Learner',
  words int not null default 0,
  minutes int not null default 0,
  stories int not null default 0,
  dictation int not null default 0,
  xp int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_key)
);

alter table public.weekly_scores enable row level security;

create policy "weekly scores readable by authenticated"
  on public.weekly_scores for select
  using (auth.role() = 'authenticated');

create policy "users insert own weekly score"
  on public.weekly_scores for insert
  with check (auth.uid() = user_id);

create policy "users update own weekly score"
  on public.weekly_scores for update
  using (auth.uid() = user_id);
