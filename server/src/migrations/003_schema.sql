-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor).
-- Creates the base/table/field/record schema with RLS scoped to the base owner.
--
-- Ownership chain: bases (user_id) -> tables (base_id) -> fields/records (table_id).
-- RLS on every table lets a row through only if the current user owns the base
-- at the top of the chain, so a user can never read or write another user's data.

-- Bases: top-level workspaces owned by a user.
create table if not exists public.bases (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create index if not exists bases_user_id_idx on public.bases (user_id);

-- Tables inside a base, ordered by position.
create table if not exists public.tables (
  id       uuid primary key default gen_random_uuid(),
  base_id  uuid not null references public.bases(id) on delete cascade,
  name     text not null,
  position integer not null default 0
);

create index if not exists tables_base_id_idx on public.tables (base_id);

-- Fields (columns) inside a table.
create table if not exists public.fields (
  id       uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables(id) on delete cascade,
  name     text not null,
  type     text not null check (type in ('text','long_text','number','checkbox','single_select','multi_select','date','attachment','linked_record')),
  options  jsonb not null default '{}'::jsonb,
  position integer not null default 0
);

create index if not exists fields_table_id_idx on public.fields (table_id);

-- Records (rows) inside a table; data holds {field_id: value} pairs.
create table if not exists public.records (
  id         uuid primary key default gen_random_uuid(),
  table_id   uuid not null references public.tables(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists records_table_id_idx on public.records (table_id);

-- RLS: every row is only reachable through the base ownership chain above.
alter table public.bases enable row level security;
alter table public.tables enable row level security;
alter table public.fields enable row level security;
alter table public.records enable row level security;

-- Security-definer helpers (they bypass RLS so the chain can be walked safely).
create or replace function public.user_owns_base(target_base_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bases
    where id = target_base_id and user_id = auth.uid()
  );
$$;

create or replace function public.user_owns_table(target_table_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bases b
    join public.tables t on t.base_id = b.id
    where t.id = target_table_id
      and b.user_id = auth.uid()
  );
$$;

revoke all on function public.user_owns_base(uuid) from public, anon;
revoke all on function public.user_owns_table(uuid) from public, anon;
grant execute on function public.user_owns_base(uuid) to authenticated;
grant execute on function public.user_owns_table(uuid) to authenticated;

-- Bases: a user can manage their own bases only.
create policy if not exists "bases user all" on public.bases
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tables: a user can manage tables inside bases they own.
create policy if not exists "tables user all" on public.tables
  for all
  using (public.user_owns_base(base_id))
  with check (public.user_owns_base(base_id));

-- Fields / records: a user can manage rows inside tables they own.
create policy if not exists "fields user all" on public.fields
  for all
  using (public.user_owns_table(table_id))
  with check (public.user_owns_table(table_id));

create policy if not exists "records user all" on public.records
  for all
  using (public.user_owns_table(table_id))
  with check (public.user_owns_table(table_id));