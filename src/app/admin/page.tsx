"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { FileType } from "@/lib/types";

const ease = [0.22, 1, 0.36, 1] as const;
const BUCKET = "vault-files";

type AuthState = "loading" | "out" | "in";

// Pick the file `type` from the browser File (mime first, then extension).
function detectType(file: File): FileType {
  const mime = file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  if (
    mime.includes("word") ||
    mime === "application/msword" ||
    ["doc", "docx", "rtf", "txt", "md", "ppt", "pptx", "xls", "xlsx", "csv"].includes(ext)
  )
    return "doc";
  return "other";
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-80);
}

export default function AdminPage() {
  const supabase = useRef(createClient()).current;

  const [auth, setAuth] = useState<AuthState>("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setAuth(data.session ? "in" : "out");
      setEmail(data.session?.user.email ?? "");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuth(session ? "in" : "out");
      setEmail(session?.user.email ?? "");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 pb-24 pt-16 sm:pt-20">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint"
      >
        files.shivamvashisth.com / admin
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease, delay: 0.05 }}
        className="mt-3 font-display text-3xl font-medium tracking-tight text-ink"
      >
        {auth === "in" ? "Add to the vault" : "Owner sign in"}
      </motion.h1>

      <div className="mt-8">
        {auth === "loading" ? (
          <p className="text-ink-faint">Checking…</p>
        ) : auth === "out" ? (
          <LoginForm supabase={supabase} />
        ) : (
          <UploadForm supabase={supabase} email={email} onSignOut={() => supabase.auth.signOut()} />
        )}
      </div>
    </main>
  );
}

type Supa = ReturnType<typeof createClient>;

function LoginForm({ supabase }: { supabase: Supa }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        This page is owner-only. Sign in with your Supabase account to add files.
      </p>
      <Field label="Email">
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          autoComplete="username" className={inputClass}
        />
      </Field>
      <Field label="Password">
        <input
          type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password" className={inputClass}
        />
      </Field>
      {error ? <p className="text-sm text-rose">{error}</p> : null}
      <button type="submit" disabled={busy} className={primaryBtn}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function UploadForm({
  supabase,
  email,
  onSignOut,
}: {
  supabase: Supa;
  email: string;
  onSignOut: () => void;
}) {
  const [mode, setMode] = useState<"file" | "link">("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const reset = useCallback(() => {
    setTitle("");
    setDescription("");
    setTags("");
    setFile(null);
    setLinkUrl("");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const tagArray = tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      if (mode === "link") {
        const url = linkUrl.trim();
        let okScheme = false;
        try {
          const proto = new URL(url).protocol;
          okScheme = proto === "https:" || proto === "http:";
        } catch {
          okScheme = false;
        }
        if (!okScheme) throw new Error("Link must start with http:// or https://");
        const { error } = await supabase.from("files").insert({
          title: title.trim(),
          description: description.trim() || null,
          type: "link",
          tags: tagArray.length ? tagArray : null,
          external_url: url,
        });
        if (error) throw error;
      } else {
        if (!file) throw new Error("Please choose a file.");
        const path = `${crypto.randomUUID()}-${safeName(file.name)}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (upErr) throw upErr;

        const { error: insErr } = await supabase.from("files").insert({
          title: title.trim(),
          description: description.trim() || null,
          type: detectType(file),
          tags: tagArray.length ? tagArray : null,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
        });
        if (insErr) {
          // roll back the orphaned upload so storage and table stay in sync
          await supabase.storage.from(BUCKET).remove([path]);
          throw insErr;
        }
      }
      setResult({ ok: true, msg: "Added. It's live on the vault now." });
      reset();
    } catch (err) {
      setResult({ ok: false, msg: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-ink-faint">
        <span>Signed in as {email}</span>
        <button type="button" onClick={onSignOut} className="underline underline-offset-2 hover:text-ink">
          Sign out
        </button>
      </div>

      <div className="flex gap-2">
        <TabButton active={mode === "file"} onClick={() => setMode("file")}>Upload a file</TabButton>
        <TabButton active={mode === "link"} onClick={() => setMode("link")}>Add a link</TabButton>
      </div>

      <Field label="Title">
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass}
          placeholder={mode === "file" ? "CAT 2024 Quant Formula Sheet" : "Rodha: Full CAT Quant Playlist"} />
      </Field>

      <Field label="Description (optional, helps search)">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          className={`${inputClass} resize-y`} placeholder="One line about what this is." />
      </Field>

      <Field label="Tags (optional, comma-separated)">
        <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass}
          placeholder="cat, quant, formulas" />
      </Field>

      {mode === "file" ? (
        <Field label="File">
          <input type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border file:border-line-strong file:bg-paper file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-ink hover:file:text-paper" />
          {file ? <p className="mt-1 font-mono text-[11px] text-ink-faint">{detectType(file).toUpperCase()} · {(file.size / 1024 / 1024).toFixed(1)} MB</p> : null}
        </Field>
      ) : (
        <Field label="Link URL">
          <input type="url" required value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
            className={inputClass} placeholder="https://…" />
        </Field>
      )}

      {result ? (
        <p className={`text-sm ${result.ok ? "text-mint" : "text-rose"}`}>{result.msg}</p>
      ) : null}

      <button type="submit" disabled={busy} className={primaryBtn}>
        {busy ? "Adding…" : "Add to the vault"}
      </button>
      <a href="/" className="text-center text-sm text-ink-faint underline underline-offset-2 hover:text-ink">
        View the vault →
      </a>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">{label}</span>
      {children}
    </label>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
        active ? "border-line-strong bg-ink text-paper" : "border-line bg-card/60 text-ink-soft hover:border-line-strong"
      }`}
    >
      {children}
    </button>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-card/80 px-3.5 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-line-strong";
const primaryBtn =
  "rounded-xl border border-line-strong bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50";
