-- Adds per-table view configuration (view switcher mode, kanban group-by field).
-- Run in the Supabase SQL editor after 003_schema.sql.
alter table public.tables
  add column if not exists view_config jsonb not null default '{}'::jsonb;