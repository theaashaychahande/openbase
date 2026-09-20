-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor).
-- Creates the users and credentials tables with RLS + auth trigger.

create extension if not exists "pgcrypto";

-- Mirrors auth.users so public rows can be linked and joined.
create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- Holds encrypted credentials per user (db connections, AI keys, etc.).
create table if not exists public.credentials (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  type            text not null check (type in ('db_connection', 'ai_key', 'other')),
  encrypted_value text not null,
  created_at      timestamptz not null default now()
);

create index if not exists credentials_user_id_idx on public.credentials (user_id);

alter table public.users enable row level security;
alter table public.credentials enable row level security;

-- Users can read/update their own profile only.
create policy "users select own" on public.users
  for select using (auth.uid() = id);

create policy "users update own" on public.users
  for update using (auth.uid() = id);

-- Users can manage their own credentials only.
create policy "credentials own" on public.credentials
  for all using (auth.uid() = user_id);

-- Automatically create a public.users row when someone signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();