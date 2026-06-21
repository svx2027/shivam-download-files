-- ============================================================
-- FILE VAULT — full backend schema, search, security, counter
-- Run this WHOLE file top-to-bottom in: Supabase Dashboard -> SQL Editor.
-- Verified against Supabase docs, current 2026.
--
-- Owner user id is already filled in (section 6b): ff15fd38-886b-409b-b125-f2ca9eb18290
-- Nothing to edit — just paste this whole file and Run.
-- ============================================================

-- 1) Typo-tolerant search extension. Supabase keeps it in the dedicated
--    `extensions` schema (not `public`) on purpose.
create extension if not exists pg_trgm with schema extensions;

-- 1b) Helper: fold the tags[] list into one space-separated string for search.
--     Why this exists: a generated column (the search_tsv below) requires every
--     function it calls to be IMMUTABLE (always same input -> same output).
--     Postgres ships array_to_string as only "stable", which it rejects.
--     Joining text tags IS genuinely deterministic, so wrapping it in our own
--     function declared IMMUTABLE is correct and safe.
create or replace function public.files_tags_text(tags text[])
returns text
language sql
immutable
as $$
  select coalesce(array_to_string(tags, ' '), '');
$$;

-- 2) The files table.
--    `type` uses text + CHECK (not a Postgres enum) so you can add a new
--    type later with ONE statement (see the note at the bottom of this file)
--    instead of fighting Postgres enum rules.
create table public.files (
  id             uuid primary key default gen_random_uuid(),
  title          text,
  description    text,
  type           text not null
                 check (type in ('image','pdf','link','doc','other')),
  tags           text[],
  storage_path   text,        -- path inside the private bucket (see 02_storage_policies.sql)
  external_url   text,        -- used when type = 'link'
  mime_type      text,
  size_bytes     bigint,
  download_count integer default 0,
  created_at     timestamptz default now(),

  -- Auto-built search index column. Title matters most (weight A), then
  -- description (B), then tags (C). files_tags_text() (defined above) folds
  -- the tags list into searchable text; `coalesce` guards empty fields. The
  -- literal 'english' is REQUIRED for a stored generated column — keep it.
  search_tsv tsvector generated always as (
      setweight(to_tsvector('english', coalesce(title, '')), 'A')
   || setweight(to_tsvector('english', coalesce(description, '')), 'B')
   || setweight(to_tsvector('english', public.files_tags_text(tags)), 'C')
  ) stored
);

-- 3) Index for fast full-text (keyword) search.
create index files_search_tsv_idx
  on public.files using gin (search_tsv);

-- 4) Index for typo tolerance on the title. Note the schema-qualified
--    `extensions.gin_trgm_ops` because pg_trgm lives in `extensions`.
create index files_title_trgm_idx
  on public.files using gin (title extensions.gin_trgm_ops);

-- ============================================================
-- 5) Search function: exact keyword match first, fuzzy typo fallback
--    second. SECURITY INVOKER = runs with the caller's permissions (does
--    NOT bypass your security rules). Call it from the app as:
--       supabase.rpc('search_files', { q: '...' })
--    The JS param name MUST be exactly `q`.
-- ============================================================
create or replace function public.search_files(q text)
returns setof public.files
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select f.*
  from public.files f
  where
        f.search_tsv @@ websearch_to_tsquery('english', q)  -- exact / keyword
     or f.title ilike '%' || q || '%'                       -- partial substring
     or word_similarity(q, f.title) > 0.3                   -- typo-tolerant (per word)
  order by
        -- real keyword hits always rank above partial/typo guesses:
        (case when f.search_tsv @@ websearch_to_tsquery('english', q) then 1 else 0 end) desc,
        ts_rank(f.search_tsv, websearch_to_tsquery('english', q)) desc,
        word_similarity(q, f.title) desc,
        f.created_at desc;
$$;

-- ============================================================
-- 6) SECURITY: turn on Row Level Security (RLS).
--    The moment this runs the table is LOCKED (deny-all) until the policies
--    below exist. Running the whole file in one go means the public read
--    page is never offline.
-- ============================================================
alter table public.files enable row level security;

-- 6a) PUBLIC READ: logged-out visitors (`anon`) and you (`authenticated`)
--     can SELECT every row. Nothing else.
create policy "Public can read files"
on public.files
for select
to anon, authenticated
using ( true );

-- ============================================================
-- 6b) WRITE = ONLY YOU. Pinned to your specific user id (safest option —
--     stays secure even if a second account ever exists).
--     (Owner id ff15fd38-886b-409b-b125-f2ca9eb18290 is already filled in below.)
-- ============================================================
create policy "Owner can insert"
on public.files
for insert
to authenticated
with check ( (select auth.uid()) = 'ff15fd38-886b-409b-b125-f2ca9eb18290'::uuid );

create policy "Owner can update"
on public.files
for update
to authenticated
using ( (select auth.uid()) = 'ff15fd38-886b-409b-b125-f2ca9eb18290'::uuid )
with check ( (select auth.uid()) = 'ff15fd38-886b-409b-b125-f2ca9eb18290'::uuid );

create policy "Owner can delete"
on public.files
for delete
to authenticated
using ( (select auth.uid()) = 'ff15fd38-886b-409b-b125-f2ca9eb18290'::uuid );

-- ============================================================
-- 7) DOWNLOAD COUNTER for logged-out visitors.
--    Visitors are read-only, so they cannot UPDATE the table directly (and
--    must NOT get an UPDATE policy — that would let them rewrite ANY column).
--    Instead this tiny function bumps ONLY download_count. It runs with
--    elevated rights (SECURITY DEFINER) but can only ever touch that one
--    counter, so it is safe to expose. Empty search_path + schema-qualified
--    table name = the required hardening.
-- ============================================================
create or replace function public.increment_download_count(file_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.files
  set download_count = download_count + 1
  where id = file_id;
$$;

-- Lock the grant down, then allow exactly the two roles:
revoke execute on function public.increment_download_count(uuid) from public;
grant  execute on function public.increment_download_count(uuid) to anon, authenticated;

-- Client call (safe from the browser — no write access leaked):
--   await supabase.rpc('increment_download_count', { file_id: id })

-- ============================================================
-- NOTE — to add a new file `type` later (e.g. 'video'), run just this:
--
--   alter table public.files
--     drop constraint files_type_check,
--     add  constraint files_type_check
--     check (type in ('image','pdf','link','doc','other','video'));
-- ============================================================
