# File Vault

A Spotlight-style public file vault, live at
[files.shivamvashisth.com](https://files.shivamvashisth.com): anyone can search
and download; only the owner can upload. No accounts, no friction.

Built as a share-first distribution channel: drop a resource in once, hand out
one link forever.

## How it works

- **Search**: Postgres full-text search (generated `tsvector` column + GIN
  index) layered with `pg_trgm` word similarity, so partial words and typos
  still find the file. One `search_files()` SQL function does keyword, substring,
  and fuzzy ranking in a single pass (`supabase/01_schema.sql`,
  narrowed in `supabase/04_hardening.sql`). Design writeup:
  [`docs/SEARCH.md`](docs/SEARCH.md).
- **Downloads**: never a raw storage URL. A server route validates the UUID,
  rate-limits by hashed IP, mints a short-TTL signed URL, and bumps a download
  counter via a `SECURITY DEFINER` RPC (`src/app/api/download`).
- **Write model**: row-level security allows public SELECT only; inserts are
  pinned to the owner. The browser-facing key can read the catalog and nothing
  else (`supabase/01_schema.sql`, `04_hardening.sql`).
- **Admin**: a single owner-auth page (`/admin`) for uploading files or adding
  external links with tags.
- **Hardening**: CSP, HSTS, noindex on admin, uniform responses to avoid
  enumeration. The pass is documented in `PROGRESS.md`.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase
(Postgres + Storage + RLS), deployed on Vercel with a custom domain.

## Run locally

```bash
npm install
npm run dev
```

Supabase setup lives in `supabase/` as ordered SQL files (schema, storage
policies, demo seed, hardening); run them in the Supabase SQL editor in order.
Environment keys are documented in the deployment notes; no service-role key is
used anywhere in the app.

## Honest scope

- No CI workflow in this repo yet — build and lint run locally, not gated on
  every push or PR the way its sibling repos in this portfolio are.
- No automated test suite; the hardening pass in `PROGRESS.md` was verified
  by hand against the live Supabase policies, not by a repeatable test run.
- Single-owner admin, no multi-user accounts, no audit trail beyond the
  download counter — "only the owner can upload" is an RLS guarantee, not a
  reviewable permissions model.
- Signed URLs are short-TTL, but there's no malware/virus scanning on
  uploads — the model assumes the owner is the only uploader and trusts
  what they upload.

## Related tools

- [the-toolshed](https://github.com/svx2027/the-toolshed): the other live web
  product — a personal site plus a shed of tiny share-first web tools.

Full index of all public repos: [github.com/svx2027](https://github.com/svx2027).
