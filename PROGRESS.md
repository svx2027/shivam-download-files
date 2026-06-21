# PROGRESS — files.shivamvashisth.com (file vault)

**One-line goal:** a public, Spotlight-style searchable file vault where only Shivam uploads and
anyone can search + download (no accounts). Stack: Next.js + TypeScript + Tailwind + Framer Motion
+ Supabase, on Vercel. **Read this file first in any new chat.**

## Status
- ✅ **Phase 0** — Oriented. Building in `~/code/shivam-download-files` (T7 SSD offline; move to T7 later).
  Supabase account: to be created together at Phase 2. Vercel pipeline already proven (main site).
- ✅ **Phase 1 (scaffold + deploy)** — DONE and LIVE:
  - Next.js 16 + React 19 + Tailwind v4 + Framer Motion 12 scaffolded (`create-next-app`, `src/` dir, App Router).
  - Brand applied in `src/app/globals.css`: warm paper/ink palette, pastel watercolour wash, **class-based dark mode**, fonts Fraunces / Inter / JetBrains Mono via `next/font` (self-hosted, no runtime CDN).
  - Branded **animated placeholder** at `src/app/page.tsx` (Framer Motion entrance + springy search-bar teaser).
  - First commit `init` pushed; private repo created; imported to Vercel (Next.js auto-detected); placeholder deployed.
- ✅ **Phase 2 (Supabase backend) — DONE & verified.**
  - **Code/SQL staged locally (NOT committed, reversible):**
    - Installed `@supabase/supabase-js@^2.108.2`, `@supabase/ssr@^0.12.0`, `server-only@^0.0.1` (versions verified current 2026).
    - `supabase/01_schema.sql` — `files` table (type via text+CHECK), generated `tsvector` + GIN full-text, `pg_trgm` + trigram GIN typo-tolerance, `search_files(q)` RPC, RLS (public SELECT / owner-pinned INSERT·UPDATE·DELETE), safe `increment_download_count(file_id)` SECURITY DEFINER RPC. **Has 3 `YOUR-UID-HERE` placeholders to replace.**
    - `supabase/02_storage_policies.sql` — owner-only write policies on private bucket `vault-files`; no public read (downloads via signed URLs). **Do NOT `alter table storage.objects`** (RLS already on; errors).
    - `supabase/README.md` — run order + key→.env mapping.
    - `src/lib/supabase/client.ts` (browser, anon/publishable key) + `src/lib/supabase/admin.ts` (server-only, secret key, `import 'server-only'`). `npm run build` passes.
  - RLS + storage policies were adversarially verified (background workflow): both **confirmed** safe; key-naming flagged → use new dashboard names mapped to existing env-var names (see below).
  - ✅ Project created (`shivam-file-vault`, ref `kbrhnedyzoljptpdloix`, region ap-south-1 Mumbai, Free). Login user created; owner UID `ff15fd38-886b-409b-b125-f2ca9eb18290` baked into `01_schema.sql`.
  - ✅ `01_schema.sql` applied successfully (one fix during apply: tags join wrapped in IMMUTABLE `files_tags_text()` helper — Postgres rejects `array_to_string` in a generated column). `files` table + search + RLS + download RPC live.
  - ✅ Private bucket `vault-files` created (Public OFF, 50 MB limit). `02_storage_policies.sql` applied (owner-only writes, no public read).
  - ✅ `.env` created with PUBLIC values filled (URL + publishable key `sb_publishable_…`). `SUPABASE_SERVICE_ROLE_KEY` left as `PASTE_SECRET_KEY_HERE` placeholder — secret never handled by Claude; Shivam pastes it when Phase 3/4 (upload/download) needs it.
  - ✅ **Live-verified via anon key (curl):** anon SELECT → 200 `[]`; anon INSERT → **401 RLS-blocked** (`42501 new row violates row-level security policy`); `search_files` rpc → 200 `[]`. Security model confirmed in production, not just "SQL ran".
  - **Phase 2 functionally COMPLETE.** Remaining loose end: paste the Secret key into `.env` (only needed for uploads/signed-download in later phases).
- **2026 key naming:** dashboard shows **Publishable key** (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and **Secret key** (`sb_secret_…`) → `SUPABASE_SERVICE_ROLE_KEY`. Legacy anon/service_role no longer generated. Env-var NAMES unchanged; only paste new key VALUES in.
- 🟡 **Phase 3 (public vault UI) — search + browse DONE & verified; file-download wiring built (needs secret key).**
  - Use case (Shivam): visitors arrive from Instagram, **search** a PDF/link and **download** — that's it. Mobile-first. Homepage IS the search.
  - Built: `src/lib/types.ts`, `src/lib/files.ts` (browser client: `listRecent`, `searchFiles`, `registerDownload`), `src/components/{SearchVault,ResultCard,FileTypeIcon}.tsx`, `src/app/page.tsx` (Spotlight search), `src/app/api/download/[id]/route.ts` (server signed-URL minting; returns 503 until secret key set; links resolve to external_url).
  - `supabase/03_seed_demo.sql` — 6 demo rows (4 pdf/doc, 2 link). Improved `search_files`: keyword (`websearch_to_tsquery`) + substring (`ilike`) + per-word typo (`word_similarity > 0.3`).
  - **Verified live (real Chrome on localhost:3000):** recent=6; `ssc`→2; typo `qunt`→2 (fuzzy ✅); no-match→empty state; 0 console errors; `tsc` clean; mobile (375px) no horizontal overflow. Links open now; PDF/file downloads pending secret key + uploaded files.
  - Fixed during build: (1) **data corruption** — em/en dashes mangled by macOS smart-dashes on SQL-editor paste → seed is now 100% ASCII; (2) **list froze on first render** — `AnimatePresence mode=popLayout` with custom-component children; removed it, list now tracks results.
  - Dev preview: `/Users/denzen/code/.claude/launch.json` got an additive **`vault-dev`** entry (npm run dev, port 3000) — the preview tool reads that file, not the project's own launch.json.
  - **⏭️ To light up PDF downloads:** paste Secret key into `.env` (`SUPABASE_SERVICE_ROLE_KEY`) + upload real files to `vault-files` (Phase 4 admin upload).

## Deployment (live)
- **Repo:** https://github.com/svx2027/shivam-download-files (private, branch `main`). Pushing to `main` auto-deploys on Vercel.
- **Vercel:** team `svx2028`, project `shivam-download-files`. **Live placeholder → https://shivam-download-files.vercel.app**
- Deployment-specific `*-svx2028.vercel.app` URLs are 401 (Vercel Deployment Protection); the production alias above is public.
- Custom domain `files.shivamvashisth.com` NOT connected yet → Phase 6 (add CNAME at GoDaddy → Vercel).

## Key decisions
- Location: `~/code/shivam-download-files` for now (T7 offline). Target later: `/Volumes/t7-denzen/code_external/personal/`.
- Tailwind **v4** = CSS-based config (`@theme` in globals.css); there is NO `tailwind.config.js`.
- Dark mode = `.dark` class on `<html>`, set by an anti-FOUC inline script (localStorage key `fv_theme`, default follows the OS). Toggle UI comes in Phase 5.
- Next **16** has breaking changes vs older versions — check `node_modules/next/dist/docs/` before using unfamiliar APIs.

## Env vars needed (NAMES only — real values live in `.env`, which is gitignored and never read/printed)
- `NEXT_PUBLIC_SUPABASE_URL` — public, browser-safe.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key, browser-safe (read-only via RLS).
- `SUPABASE_SERVICE_ROLE_KEY` — **server-only secret**, never sent to the browser, never committed.
(See `.env.example`.)

## Run / test locally
- `cd ~/code/shivam-download-files`
- `npm run dev` → open http://localhost:3000
- `npm run build` → production build check

## Open reminders
- Enable **Vercel + GitHub 2FA** (pending from the last security review) — re-flag at deploy.
- **Phase 6:** ship the main site's security headers; CSP needs a nonce for Next's inline scripts (incl. the theme script); widen `connect-src` + `img-src` for `*.supabase.co`. Set **spend caps** on Supabase AND Vercel.
- **Epic 2 (LATER — remind Shivam before starting):** per-tool subdomains `abc.shivamvashisth.com` + Framer wow on tool pages. Do NOT start without a reminder.

## Phase map
0 Orient ✅ · 1 Scaffold+deploy ✅ · 2 Supabase backend ✅ · 3 Public vault UI 🟡 (search+browse live & verified; PDF download needs secret key) · 4 Admin upload (owner-only) · 5 Wow polish (Framer + 1 3D moment) · 6 Deploy + domain + headers + caps.

MEMORY: when this chat gets heavy, run /compact; PROGRESS.md holds the durable state.
