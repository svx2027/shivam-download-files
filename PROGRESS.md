# PROGRESS — files.shivamvashisth.com (file vault)

**One-line goal:** a public, Spotlight-style searchable file vault where only Shivam uploads and
anyone can search + download (no accounts). Stack: Next.js + TypeScript + Tailwind + Framer Motion
+ Supabase, on Vercel. **Read this file first in any new chat.**

## Status
- ✅ **Phase 0** — Oriented. Building in `~/code/shivam-download-files` (T7 SSD offline; move to T7 later).
  Supabase account: to be created together at Phase 2. Vercel pipeline already proven (main site).
- 🟡 **Phase 1 (scaffold)** — DONE locally, NOT yet committed/pushed/deployed (waiting on Shivam's go):
  - Next.js 16 + React 19 + Tailwind v4 + Framer Motion 12 scaffolded (`create-next-app`, `src/` dir, App Router).
  - Brand applied in `src/app/globals.css`: warm paper/ink palette, pastel watercolour wash, **class-based dark mode**, fonts Fraunces / Inter / JetBrains Mono via `next/font` (self-hosted, no runtime CDN).
  - Branded **animated placeholder** at `src/app/page.tsx` (Framer Motion entrance + springy search-bar teaser).
  - `.env.example` (placeholders only) + `.gitignore` allows it; create-next-app's auto-commit was removed so the first commit will be `init`.
- ⏭️ **Next:** Shivam says go → first commit `init` → create **private** repo `svx2027/shivam-download-files` → deploy placeholder to Vercel (prove the pipeline end-to-end).

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
0 Orient ✅ · 1 Scaffold+deploy 🟡 · 2 Supabase backend (table, storage, RLS, search) · 3 Public vault UI (Spotlight search + filters + download) · 4 Admin upload (owner-only) · 5 Wow polish (Framer + 1 3D moment) · 6 Deploy + domain + headers + caps.

MEMORY: when this chat gets heavy, run /compact; PROGRESS.md holds the durable state.
