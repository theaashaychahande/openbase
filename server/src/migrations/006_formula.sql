-- Extends the fields type check to include the new 'formula' field type.
-- Run in the Supabase SQL editor after 005_view_config.sql.
alter table public.fields drop constraint if exists fields_type_check;
alter table public.fields
  add constraint fields_type_check check (type in (
    'text','long_text','number','checkbox','single_select','multi_select',
    'date','attachment','linked_record','formula'
  ));