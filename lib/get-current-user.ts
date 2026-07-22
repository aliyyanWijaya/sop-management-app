import { createClient } from '@/lib/supabase/server'
import type { CurrentUser } from '@/lib/types'

// Dipakai di layout/page manapun yang butuh tahu siapa yang login
// dan apa role-nya (bukan cuma auth.uid(), tapi data lengkap dari
// tabel `users`). Dipusatkan di sini supaya query-nya tidak diulang
// di banyak tempat.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, email, role, department_id')
    .eq('id', authUser.id)
    .single()

  return profile as CurrentUser | null
}
