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
