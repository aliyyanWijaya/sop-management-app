import { createBrowserClient } from '@supabase/ssr'

// Dipakai di dalam Client Components ("use client").
// Contoh: const supabase = createClient()
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
