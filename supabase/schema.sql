create extension if not exists pgcrypto;

create table if not exists public.drills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.drill_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  drill_id uuid not null references public.drills(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.drills enable row level security;
alter table public.players enable row level security;
alter table public.drill_entries enable row level security;

drop policy if exists "public drill access" on public.drills;
create policy "public drill access"
on public.drills
for all
using (true)
with check (true);

drop policy if exists "public player access" on public.players;
create policy "public player access"
on public.players
for all
using (true)
with check (true);

drop policy if exists "public drill entry access" on public.drill_entries;
create policy "public drill entry access"
on public.drill_entries
for all
using (true)
with check (true);
