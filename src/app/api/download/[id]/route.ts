import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// The admin client uses the secret key, so this must run on Node (not edge).
export const runtime = "nodejs";

const BUCKET = "vault-files";
const PLACEHOLDER = "PASTE_SECRET_KEY_HERE";
const SIGNED_URL_TTL_SECONDS = 120; // short-lived link, just long enough to click through

// Returns a short-lived download URL for a file row. Links resolve straight to
// their external URL; stored files get a signed URL minted server-side.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Secret key not set yet → file downloads aren't available (links still work).
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || secret === PLACEHOLDER) {
    return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
  }

  const supabase = createAdminClient();

  const { data: file, error } = await supabase
    .from("files")
    .select("id,type,title,storage_path,external_url")
    .eq("id", id)
    .single();

  if (error || !file) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (file.type === "link" && file.external_url) {
    await bumpCount(supabase, id);
    return NextResponse.json({ url: file.external_url });
  }

  if (!file.storage_path) {
    return NextResponse.json({ error: "no_file" }, { status: 404 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(file.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: file.title ?? true,
    });

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: "sign_failed" }, { status: 404 });
  }

  await bumpCount(supabase, id);
  return NextResponse.json({ url: signed.signedUrl });
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
