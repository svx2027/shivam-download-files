import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// The admin client uses the secret key, so this must run on Node (not edge).
export const runtime = "nodejs";

const BUCKET = "vault-files";
const PLACEHOLDER = "PASTE_SECRET_KEY_HERE";
const SIGNED_URL_TTL_SECONDS = 60; // short-lived link, just long enough to click through

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// No shared/CDN cache may ever retain a response carrying a signed URL.
const NO_STORE = { "Cache-Control": "private, no-store" } as const;
function reply(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extra } });
}

// Best-effort in-memory per-IP rate limit. This is a first speed bump against a
// scripted flood hitting ONE serverless instance — NOT a hard guarantee across
// instances. The real backstops are the Supabase/Vercel spend caps and a proper
// edge limiter (Upstash) if traffic grows. Fails open on any error.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, { n: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  try {
    const now = Date.now();
    const cur = hits.get(ip);
    if (!cur || now > cur.resetAt) {
      hits.set(ip, { n: 1, resetAt: now + WINDOW_MS });
      if (hits.size > 5000) for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
      return false;
    }
    cur.n += 1;
    return cur.n > MAX_PER_WINDOW;
  } catch {
    return false;
  }
}

function isHttpUrl(u: string | null | undefined): boolean {
  if (!u) return false;
  try {
    const p = new URL(u).protocol;
    return p === "https:" || p === "http:";
  } catch {
    return false;
  }
}

// Returns a short-lived download URL for a file row. Links resolve straight to
// their external URL; stored files get a signed URL minted server-side.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Reject malformed ids before touching Supabase (cheap, no info leak).
  if (!UUID_RE.test(id)) {
    return reply({ error: "not_found" }, 404);
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return reply({ error: "rate_limited" }, 429, { "Retry-After": "60" });
  }

  // Secret key not set yet → file downloads aren't available (links still work).
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || secret === PLACEHOLDER) {
    return reply({ error: "storage_not_configured" }, 503);
  }

  const supabase = createAdminClient();

  const { data: file, error } = await supabase
    .from("files")
    .select("id,type,title,storage_path,external_url")
    .eq("id", id)
    .single();

  if (error || !file) {
    return reply({ error: "not_found" }, 404);
  }

  if (file.type === "link") {
    // Only ever hand back http(s) links (defends against javascript:/data: values).
    if (!isHttpUrl(file.external_url)) {
      return reply({ error: "not_found" }, 404);
    }
    await bumpCount(supabase, id);
    return reply({ url: file.external_url });
  }

  if (!file.storage_path) {
    return reply({ error: "no_file" }, 404);
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(file.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: file.title ?? true,
    });

  if (signError || !signed?.signedUrl) {
    return reply({ error: "sign_failed" }, 404);
  }

  await bumpCount(supabase, id);
  return reply({ url: signed.signedUrl });
}

async function bumpCount(
  supabase: ReturnType<typeof createAdminClient>,
  id: string,
): Promise<void> {
  // Best-effort; a failed counter must never fail the download.
  try {
    await supabase.rpc("increment_download_count", { file_id: id });
  } catch {
    /* ignore */
  }
}
