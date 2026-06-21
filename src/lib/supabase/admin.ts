import 'server-only' // build FAILS if this file is ever imported into the browser — safety net
import { createClient } from '@supabase/supabase-js'

// SERVER-ONLY admin client. Uses the SECRET (service_role) key, which
// BYPASSES all Row Level Security. It must never reach the browser:
//   - the key has NO  NEXT_PUBLIC_  prefix, so Next.js keeps it server-side
//   - the `import 'server-only'` line above turns any client import into a
//     build error
// Use this only inside server code (API route handlers, server actions) for
// owner actions and for minting signed download URLs.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY! // paste the sb_secret_... value here in .env
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
