import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const SUPABASE_ORIGIN = "https://kbrhnedyzoljptpdloix.supabase.co";
const SUPABASE_WS = "wss://kbrhnedyzoljptpdloix.supabase.co";

// Content-Security-Policy.
// 'unsafe-inline' is required because Next injects inline bootstrap scripts and
// the anti-FOUC theme script (layout.tsx), and React/Framer emit inline style
// attributes. 'unsafe-eval' is added ONLY in dev (React's dev overlay uses eval;
// it is never needed in production). connect-src is opened to this project's
// Supabase origin for the browser client's REST/auth calls.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:`,
  `font-src 'self'`,
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS}`,
  `object-src 'none'`,
  `base-uri 'none'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Keep the owner login page out of search indexes (also see app/robots.ts).
      { source: "/admin", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
