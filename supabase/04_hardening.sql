-- ============================================================
-- FILE VAULT — 04 hardening (from the security review, 2026-07-02)
-- Run this WHOLE file in: Supabase Dashboard -> SQL Editor.
-- Then do the three DASHBOARD toggles listed at the bottom.
-- Safe to re-run (drops+recreates policies/functions/constraint).
-- Owner uid: ff15fd38-886b-409b-b125-f2ca9eb18290
-- ============================================================

-- 1) STORAGE (the fix for the HIGH finding): re-pin the vault-files write
--    policies to the OWNER UID. The old policies trusted the `authenticated`
--    ROLE (owner_id = auth.uid()), which ANY signed-up user satisfies — so a
--    stranger who created an account could write into the private bucket.
--    Pin to the owner uid, exactly like the files table does.
drop policy if exists "vault owner can upload" on storage.objects;
drop policy if exists "vault owner can update" on storage.objects;
drop policy if exists "vault owner can delete" on storage.objects;

create policy "vault owner can upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'vault-files'
  and (select auth.uid()) = 'ff15fd38-886b-409b-b125-f2ca9eb18290'::uuid
);

create policy "vault owner can update"
on storage.objects for update to authenticated
using (
  bucket_id = 'vault-files'
  and (select auth.uid()) = 'ff15fd38-886b-409b-b125-f2ca9eb18290'::uuid
)
with check (
  bucket_id = 'vault-files'
  and (select auth.uid()) = 'ff15fd38-886b-409b-b125-f2ca9eb18290'::uuid
);

create policy "vault owner can delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'vault-files'
  and (select auth.uid()) = 'ff15fd38-886b-409b-b125-f2ca9eb18290'::uuid
);

-- 2) COUNTER: stop the browser (anon) from calling the bump RPC directly.
--    Downloads are now counted server-side inside /api/download, which uses the
--    secret key (service_role bypasses grants). Revoke anon/authenticated exec.
revoke execute on function public.increment_download_count(uuid) from anon, authenticated;

-- 3) LINKS: reject non-http(s) URLs at the database level (defense in depth,
--    on top of the app-level checks).
alter table public.files drop constraint if exists files_external_url_scheme;
alter table public.files
  add constraint files_external_url_scheme
  check (external_url is null or external_url ~* '^https?://');

-- 4) SEARCH: stop returning internal columns (storage_path, search_tsv) to the
--    browser. Return only what the UI needs. (The old function returned the
--    whole row via `setof public.files`.)
drop function if exists public.search_files(text);
create function public.search_files(q text)
returns table (
  id uuid, title text, description text, type text, tags text[],
  external_url text, mime_type text, size_bytes bigint,
  download_count integer, created_at timestamptz
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select f.id, f.title, f.description, f.type, f.tags,
         f.external_url, f.mime_type, f.size_bytes, f.download_count, f.created_at
  from public.files f
  where
        f.search_tsv @@ websearch_to_tsquery('english', q)
     or f.title ilike '%' || q || '%'
     or word_similarity(q, f.title) > 0.3
  order by
        (case when f.search_tsv @@ websearch_to_tsquery('english', q) then 1 else 0 end) desc,
        ts_rank(f.search_tsv, websearch_to_tsquery('english', q)) desc,
        word_similarity(q, f.title) desc,
        f.created_at desc;
$$;

-- ============================================================
-- DASHBOARD TOGGLES (cannot be done in SQL — do these too):
--   A) Authentication -> Sign In / Providers -> turn OFF "Allow new users to
--      sign up". The vault has ONE owner account and no visitor signups; this
--      removes the `authenticated` role from strangers entirely.
--   B) Authentication -> enable MFA for the owner login; turn on leaked-password
--      protection.
--   C) Storage -> vault-files -> set allowed MIME types + a max file size
--      (e.g. 25-50 MB) if not already set.
--   D) Project Settings -> Billing -> set a Spend Cap and add usage/egress
--      alerts (the real backstop against a download/egress cost attack).
-- ============================================================
