import type { FileType } from "@/lib/types";

// Accent colour per file type (brand tokens from globals.css).
const tone: Record<FileType, string> = {
  pdf: "text-peach",
  doc: "text-sky",
  image: "text-mint",
  link: "text-lavender",
  other: "text-rose",
};

export function FileTypeIcon({ type }: { type: FileType }) {
  return (
    <span
      className={`grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-paper/60 ${tone[type]}`}
      aria-hidden="true"
    >
      <Glyph type={type} />
    </span>
  );
}

function Glyph({ type }: { type: FileType }) {
  if (type === "link") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 14.5l5-5" />
        <path d="M11 6.8l1.3-1.3a3.8 3.8 0 015.4 5.4L16.4 12" />
        <path d="M13 17.2l-1.3 1.3a3.8 3.8 0 01-5.4-5.4L7.6 12" />
      </svg>
    );
  }
  if (type === "image") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="M5 17.5l4.2-4 3 2.4L16 11l3 3.4" />
      </svg>
    );
  }
  // pdf / doc / other → document glyph (pdf gets a label, doc gets text lines)
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3.5H7.5A1.5 1.5 0 006 5v14a1.5 1.5 0 001.5 1.5h9A1.5 1.5 0 0018 19V7.5L14 3.5z" />
      <path d="M13.8 3.6V8h4.1" />
      {type === "pdf" ? (
        <text x="12" y="16.6" textAnchor="middle" fontSize="4.3" fill="currentColor" stroke="none" fontFamily="monospace">PDF</text>
      ) : type === "doc" ? (
        <>
          <path d="M9 12.5h6" />
          <path d="M9 15.5h4.5" />
        </>
      ) : null}
    </svg>
  );
}
