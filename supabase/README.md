# Supabase setup (Phase 2)

These SQL files build the backend for the file vault. Run them **in your
Supabase project's SQL Editor**, in this order, once the project exists.

## Order

1. **Create your login user first** — Dashboard → Authentication → Users →
   Add user (your own email + password). You need its **User UID** for step 2.
2. **`01_schema.sql`** — the `files` table, full-text + typo-tolerant search,
   Row Level Security (public read / owner-only writes), and the safe
   download counter.
   ⚠️ Before running, replace all 3 `YOUR-UID-HERE` placeholders (section 6b)
   with your User UID from step 1.
3. **Create the Storage bucket** — Dashboard → Storage → New bucket → name it
   exactly **`vault-files`** → leave **Public OFF** (private) → Create.
4. **`02_storage_policies.sql`** — owner-only upload/update/delete on that
   bucket; no public read (downloads go through server-minted signed URLs).

## Keys → `.env` (never committed)

After the project is ready, copy from the dashboard into your local `.env`
(see `.env.example` for the exact variable names):

| Dashboard value (2026 naming) | `.env` variable |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key (`sb_publishable_…`) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Secret key (`sb_secret_…`) | `SUPABASE_SERVICE_ROLE_KEY` |

The first two are browser-safe. The **Secret key is server-only** — never
prefix it with `NEXT_PUBLIC_`, never paste it anywhere public.
