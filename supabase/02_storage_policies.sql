-- ============================================================
-- FILE VAULT — Storage policies for the PRIVATE bucket 'vault-files'
--
-- DO THIS FIRST (in the dashboard, not here):
--   Storage -> New bucket -> name it exactly  vault-files
--   -> leave "Public bucket" toggle OFF (private is the default & the point)
--   -> (optional) set a max file size and allowed MIME types
--   -> Create. Then re-check Configuration shows Public = OFF.
--
-- THEN run this file in: Supabase Dashboard -> SQL Editor.
--
-- Why private: a public bucket serves any file to anyone with the URL,
-- ignoring all security. A private bucket is only reachable through a
-- short-lived "signed URL" your server mints. That is the secure design.
--
-- NOTE: Row Level Security is ALREADY ON for storage.objects on managed
-- Supabase. Do NOT run `alter table storage.objects ...` — it errors with
-- "must be owner of table objects". Just create the three policies below.
-- ============================================================

-- 1) UPLOAD: only a logged-in owner, only this bucket.
create policy "vault owner can upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vault-files'
  and owner_id = (select auth.uid()::text)
);

-- 2) UPDATE / overwrite: only a logged-in owner, only this bucket.
create policy "vault owner can update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vault-files'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'vault-files'
  and owner_id = (select auth.uid()::text)
);

-- 3) DELETE: only a logged-in owner, only this bucket.
create policy "vault owner can delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vault-files'
  and owner_id = (select auth.uid()::text)
);

-- DELIBERATELY NO SELECT/read policy for logged-out visitors:
--   => nobody can browse or list your files directly
--   => downloads happen ONLY via server-minted signed URLs
--
-- Expected (not a bug): files your SERVER uploads with the secret key have
-- no owner_id, so the owner-only update/delete policies above won't match
-- them from a plain logged-in browser session. That's fine — the secret key
-- bypasses RLS, so the server manages all writes. These policies exist to
-- block any client-side authenticated writes.
