import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client for reads + search from client components.
// Uses ONLY the public (publishable / anon) key, which is safe to ship to
// the browser because Row Level Security limits it to read-only access.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // paste the sb_publishable_... value here in .env
  )
}
