-- Creates a public Storage bucket for record attachments and lets anyone read
-- files from it (uploads go through the server, which uses the service key).
--
-- Files are stored under untrusted-path UUIDs, so public read access is safe.
insert into storage.buckets (id, name, public)
values ('openbase-attachments', 'openbase-attachments', true)
on conflict (id) do update set public = true;

create policy if not exists "openbase attachments public read" on storage.objects
  for select using (bucket_id = 'openbase-attachments');