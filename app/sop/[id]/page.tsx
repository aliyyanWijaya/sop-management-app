import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SopStatusBadge } from '@/components/sop/SopStatusBadge'
import type { SopStatus } from '@/lib/types'

// Versi awal halaman detail — cukup buat verifikasi hasil form authoring
// (2a). Section content (purpose, scope, procedure, dst) baru ditambahkan
// full di langkah 2b-2d, termasuk tombol edit & submit for review.
export default async function SopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: sop } = await supabase
    .from('sops')
    .select(
      `
      id, title, document_number, status,
      category:sop_categories ( name ),
      current_version:sop_versions!fk_sops_current_version (
        id, version_number, status, content, author_id
      )
    `
    )
    .eq('id', id)
    .single()

  if (!sop) {
    // RLS otomatis bikin query di atas balik null kalau bukan
    // stakeholder-nya dan SOP belum published — jadi notFound() di sini
    // sekaligus berfungsi sebagai proteksi akses, bukan cuma "data hilang".
    notFound()
  }

  const version = Array.isArray(sop.current_version)
    ? sop.current_version[0]
    : sop.current_version
  const category = Array.isArray(sop.category) ? sop.category[0] : sop.category

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-gray-500">{sop.document_number}</p>
          <h1 className="text-xl font-semibold">{sop.title}</h1>
          <p className="text-sm text-gray-500">{category?.name ?? '-'}</p>
        </div>
        <SopStatusBadge status={sop.status as SopStatus} />
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <p className="text-sm text-gray-500">
          Versi {version?.version_number ?? '-'} — status: {version?.status ?? '-'}
        </p>
        <p className="text-sm">
          <span className="font-medium">Purpose: </span>
          {version?.content?.purpose || (
            <span className="italic text-gray-400">belum diisi</span>
          )}
        </p>
        <p className="text-sm">
          <span className="font-medium">Scope — Berlaku untuk: </span>
          {version?.content?.scope?.applies_to || (
            <span className="italic text-gray-400">belum diisi</span>
          )}
        </p>
        {version?.content?.scope?.excludes && (
          <p className="text-sm">
            <span className="font-medium">Scope — Tidak berlaku untuk: </span>
            {version.content.scope.excludes}
          </p>
        )}

        {version?.status === 'draft' && (
          <a
            href={`/sop/${sop.id}/edit`}
            className="inline-block rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Edit
          </a>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Section lengkap lainnya (references, definitions, roles, procedure,
        appendices) ditambahkan bertahap di langkah berikutnya.
      </p>
    </div>
  )
}
