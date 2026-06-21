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

// Columns to select for the public list/search (everything except the internal
// search_tsv vector, which isn't useful in the browser).
export const FILE_COLUMNS =
  "id,title,description,type,tags,storage_path,external_url,mime_type,size_bytes,download_count,created_at";
