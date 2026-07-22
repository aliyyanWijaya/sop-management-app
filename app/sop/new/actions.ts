'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Bentuk `content` paling minimal dulu — section lain (scope, references,
// dst) ditambahkan bertahap di langkah 2b, 2c, 2d. Struktur ini harus
// tetap konsisten dengan skema jsonb yang sudah kita desain, supaya
// nanti gampang di-extend tanpa perlu migration ulang.
const EMPTY_CONTENT = {
  purpose: '',
  scope: { applies_to: '', excludes: '' },
  references: [],
  definitions: [],
  roles_responsibilities: [],
  procedure: [],
  appendices: [],
}

export async function createSopDraft(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const title = formData.get('title') as string
  const documentNumber = formData.get('document_number') as string
  const categoryId = formData.get('category_id') as string

  if (!title || !documentNumber || !categoryId) {
    redirect(
      '/sop/new?error=' + encodeURIComponent('Judul, nomor dokumen, dan kategori wajib diisi')
    )
  }

  // 1. Buat baris `sops` (payung SOP-nya)
  const { data: sop, error: sopError } = await supabase
    .from('sops')
    .insert({
      category_id: categoryId,
      title,
      document_number: documentNumber,
      status: 'draft',
    })
    .select('id')
    .single()

  if (sopError || !sop) {
    redirect('/sop/new?error=' + encodeURIComponent(sopError?.message ?? 'Gagal membuat SOP'))
  }

  // 2. Buat versi pertama (`sop_versions`), author = user yang login
  const { data: version, error: versionError } = await supabase
    .from('sop_versions')
    .insert({
      sop_id: sop!.id,
      version_number: 1,
      content: EMPTY_CONTENT,
      status: 'draft',
      author_id: authUser.id,
    })
    .select('id')
    .single()

  if (versionError || !version) {
    redirect(
      '/sop/new?error=' + encodeURIComponent(versionError?.message ?? 'Gagal membuat versi SOP')
    )
  }

  // 3. Hubungkan `sops.current_version_id` ke versi yang baru dibuat
  const { error: updateError } = await supabase
    .from('sops')
    .update({ current_version_id: version!.id })
    .eq('id', sop!.id)

  if (updateError) {
    redirect('/sop/new?error=' + encodeURIComponent(updateError.message))
  }

  redirect(`/sop/${sop!.id}`)
}
