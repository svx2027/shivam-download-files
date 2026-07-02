// Shape of a row in the `files` table (see supabase/01_schema.sql).
export type FileType = "image" | "pdf" | "link" | "doc" | "other";

export interface FileRow {
  id: string;
  title: string | null;
  description: string | null;
  type: FileType;
  tags: string[] | null;
  storage_path: string | null;
  external_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  download_count: number | null;
  created_at: string;
}

// Columns exposed to the browser. storage_path and search_tsv are intentionally
// omitted — the browser never needs the internal object path (the download API
// resolves it server-side from the id), and leaking it is needless disclosure.
export const FILE_COLUMNS =
  "id,title,description,type,tags,external_url,mime_type,size_bytes,download_count,created_at";
