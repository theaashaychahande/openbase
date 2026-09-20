-- Adds an optional human-friendly label to credentials so the Settings page
-- can list multiple entries (e.g. "prod DB", "Anthropic key").
alter table public.credentials
  add column if not exists name text;