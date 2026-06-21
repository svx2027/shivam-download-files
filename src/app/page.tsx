"use client";

import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint"
      >
        files.shivamvashisth.com
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.05 }}
        className="text-center font-display text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-6xl"
      >
        The vault, opening soon.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.12 }}
        className="mt-5 max-w-xl text-center text-lg text-ink-soft"
      >
        A fast, searchable home for my files. Search like Spotlight, download in a tap.
        No account needed.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.2 }}
        className="mt-10 w-full max-w-xl"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-card/80 px-5 py-4 shadow-sm backdrop-blur">
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.7" className="text-ink-faint"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <span className="text-ink-faint">Search files, PDFs, links…</span>
          <span className="ml-auto rounded-md border border-line-strong px-2 py-1 font-mono text-[11px] text-ink-faint">
            ⌘K
          </span>
        </div>
        <p className="mt-4 text-center text-sm text-ink-faint">
          Live search and downloads arrive in the next build.
        </p>
      </motion.div>
    </main>
  );
}
