"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { searchFiles } from "@/lib/files";
import type { FileRow } from "@/lib/types";
import { ResultCard } from "@/components/ResultCard";

const ease = [0.22, 1, 0.36, 1] as const;
type Status = "loading" | "ready" | "error";

export function SearchVault() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FileRow[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch results whenever the query changes (debounced; ignores stale responses).
  useEffect(() => {
    const id = ++reqId.current;
    setStatus("loading");
    const delay = query.trim() ? 180 : 0;
    const timer = setTimeout(async () => {
      try {
        const rows = await searchFiles(query);
        if (id === reqId.current) {
          setResults(rows);
          setStatus("ready");
        }
      } catch {
        if (id === reqId.current) setStatus("error");
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard: ⌘/Ctrl+K or "/" focuses search; Esc clears it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const onInput = document.activeElement === inputRef.current;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === "/" && !onInput) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Escape" && onInput) {
        setQuery("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  // Optimistically bump the visible counter so a download feels instant.
  const bumpCount = useCallback((id: string) => {
    setResults((rows) =>
      rows.map((r) =>
        r.id === id ? { ...r, download_count: (r.download_count ?? 0) + 1 } : r,
      ),
    );
  }, []);

  const handleDownload = useCallback(
    async (file: FileRow) => {
      if (file.type === "link" && file.external_url) {
        // Only open http(s) links (guards against javascript:/data: values).
        let safe = false;
        try {
          const proto = new URL(file.external_url).protocol;
          safe = proto === "https:" || proto === "http:";
        } catch {
          safe = false;
        }
        if (!safe) {
          showToast("Sorry — that link isn’t available.");
          return;
        }
        bumpCount(file.id);
        window.open(file.external_url, "_blank", "noopener,noreferrer");
        // Record the click server-side (fire-and-forget; no anon RPC from the browser).
        void fetch(`/api/download/${file.id}`).catch(() => {});
        return;
      }
      try {
        const res = await fetch(`/api/download/${file.id}`);
        const data = (await res.json().catch(() => ({}))) as { url?: string };
        if (res.status === 503) {
          showToast("File downloads turn on once the Supabase secret key is added.");
          return;
        }
        if (!res.ok || !data.url) {
          showToast("Sorry — that file isn’t available right now.");
          return;
        }
        bumpCount(file.id);
        window.location.href = data.url;
      } catch {
        showToast("Sorry — that file isn’t available right now.");
      }
    },
    [bumpCount, showToast],
  );

  const trimmed = query.trim();
  const hasResults = results.length > 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 pb-28 pt-16">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint"
      >
        files.shivamvashisth.com
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease, delay: 0.05 }}
        className="mt-3 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl"
      >
        Search the vault
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease, delay: 0.1 }}
        className="mt-2 text-ink-soft"
      >
        Find a PDF or link and download it in a tap. No account needed.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.16 }}
        className="sticky top-4 z-10 mt-7"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-card/85 px-4 py-3.5 shadow-sm backdrop-blur transition-colors focus-within:border-line-strong">
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.7" className="shrink-0 text-ink-faint"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            aria-label="Search files"
            placeholder="Search files, PDFs, links…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="shrink-0 rounded-md px-1.5 text-ink-faint transition-colors hover:text-ink"
            >
              ✕
            </button>
          ) : (
            <span className="shrink-0 rounded-md border border-line-strong px-2 py-1 font-mono text-[11px] text-ink-faint">
              ⌘K
            </span>
          )}
        </div>
      </motion.div>

      <div className="mt-7 flex-1">
        <div className="mb-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-ink-faint">
          <span>{trimmed ? `Results for “${trimmed}”` : "Recent"}</span>
          {status === "ready" && hasResults ? (
            <span>{results.length} {results.length === 1 ? "file" : "files"}</span>
          ) : null}
        </div>

        {status === "error" ? (
          <p className="rounded-2xl border border-line bg-card/60 p-6 text-center text-ink-soft">
            Something went wrong loading the vault. Please refresh and try again.
          </p>
        ) : status === "loading" && !hasResults ? (
          <SkeletonList />
        ) : status === "ready" && !hasResults ? (
          <p className="rounded-2xl border border-line bg-card/60 p-8 text-center text-ink-soft">
            {trimmed
              ? `No matches for “${trimmed}”. Try a different word.`
              : "No files in the vault yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {results.map((file, i) => (
              <ResultCard key={file.id} file={file} index={i} onDownload={handleDownload} />
            ))}
          </ul>
        )}
      </div>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease }}
            className="fixed inset-x-4 bottom-6 z-20 mx-auto max-w-md rounded-xl border border-line-strong bg-card px-4 py-3 text-center text-sm text-ink shadow-lg backdrop-blur"
            role="status"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function SkeletonList() {
  return (
    <ul className="flex flex-col gap-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="flex items-start gap-4 rounded-2xl border border-line bg-card/50 p-4"
        >
          <div className="size-11 shrink-0 animate-pulse rounded-xl bg-line" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-2/3 animate-pulse rounded bg-line" />
            <div className="h-3 w-full animate-pulse rounded bg-line/70" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-line/70" />
          </div>
        </li>
      ))}
    </ul>
  );
}
