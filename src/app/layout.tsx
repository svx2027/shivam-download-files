import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "files.shivamvashisth.com — searchable file vault",
  description:
    "A fast, searchable vault of files. Search like Spotlight, download in a tap. No account needed.",
};

// Anti-FOUC: set the theme class before paint so dark mode never flashes.
const themeScript = `try{var t=localStorage.getItem('fv_theme')||((window.matchMedia&&matchMedia('(prefers-color-scheme:dark)').matches)?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <a
          href="https://shivamvashisth.com"
          aria-label="Back to shivamvashisth.com"
          className="fixed left-4 top-4 z-50 inline-flex items-center gap-1.5 rounded-full border border-line bg-card/70 px-3 py-1.5 text-sm font-medium text-ink-soft shadow-sm backdrop-blur transition-colors hover:border-line-strong hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="font-display font-semibold leading-none">
            <span className="hidden sm:inline">Shivam Vashisth</span>
            <span className="sm:hidden">SV</span>
          </span>
        </a>
        {children}
      </body>
    </html>
  );
}
