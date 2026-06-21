"use client";

import { motion } from "framer-motion";
import type { FileRow } from "@/lib/types";
import { FileTypeIcon } from "@/components/FileTypeIcon";

const ease = [0.22, 1, 0.36, 1] as const;

function formatSize(bytes: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${i === 0 || n >= 10 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

export function ResultCard({
  file,
  index,
  onDownload,
}: {
  file: FileRow;
  index: number;
  onDownload: (file: FileRow) => void;
}) {
  const size = formatSize(file.size_bytes);
  const isLink = file.type === "link";
  const downloads = file.download_count ?? 0;

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease, delay: Math.min(index * 0.035, 0.28) }}
      className="group flex items-start gap-4 rounded-2xl border border-line bg-card/80 p-4 shadow-sm backdrop-blur transition-colors hover:border-line-strong"
    >
      <FileTypeIcon type={file.type} />

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-lg font-medium leading-snug text-ink">
          {file.title ?? "Untitled"}
        </h3>

        {file.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{file.description}</p>
        ) : null}

        {file.tags && file.tags.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {file.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-line bg-paper/50 px-1.5 py-0.5 font-mono text-[11px] text-ink-faint"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-2.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
          <span>{file.type}</span>
          {size ? <span>· {size}</span> : null}
          {downloads > 0 ? (
            <span>· {downloads} {downloads === 1 ? "download" : "downloads"}</span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onDownload(file)}
        className="shrink-0 self-center rounded-xl border border-line-strong bg-paper px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
      >
        {isLink ? "Open ↗" : "Download"}
      </button>
    </motion.li>
  );
}
