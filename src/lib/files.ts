import { createClient } from "@/lib/supabase/client";
import { FILE_COLUMNS, type FileRow } from "@/lib/types";

// One browser client, created lazily on first use (never during SSR import).
let client: ReturnType<typeof createClient> | null = null;
function db() {
  client ??= createClient();
  return client;
}

// Default view: newest files first.
export async function listRecent(limit = 30): Promise<FileRow[]> {
  const { data, error } = await db()
    .from("files")
    .select(FILE_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FileRow[];
}

// Search: keyword + typo-tolerant, via the search_files() RPC. Empty query
// falls back to the recent list.
export async function searchFiles(query: string): Promise<FileRow[]> {
  const q = query.trim();
  if (!q) return listRecent();
  const { data, error } = await db().rpc("search_files", { q });
  if (error) throw error;
  return (data ?? []) as FileRow[];
}

// Download counting now happens server-side inside /api/download (which uses
// the secret key). The browser no longer calls the counter RPC directly — anon
// EXECUTE on it is revoked in supabase/04_hardening.sql — so it can't be spammed
// to inflate counts.
