import Link from 'next/link'
import type { SopListItem } from '@/lib/types'
import { SopStatusBadge } from './SopStatusBadge'

export function SopTable({ sops }: { sops: SopListItem[] }) {
  if (sops.length === 0) {
    return (
      <p className="rounded border border-dashed p-8 text-center text-sm text-gray-500">
        Belum ada SOP. Klik &quot;Buat SOP Baru&quot; di sidebar untuk mulai.
      </p>
    )
  }

  return (
    <table className="w-full border-collapse overflow-hidden rounded-lg bg-white text-sm shadow-sm">
      <thead>
        <tr className="border-b bg-gray-50 text-left text-gray-600">
          <th className="px-4 py-3 font-medium">No. Dokumen</th>
          <th className="px-4 py-3 font-medium">Judul</th>
          <th className="px-4 py-3 font-medium">Kategori</th>
          <th className="px-4 py-3 font-medium">Versi</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium">Berlaku s/d</th>
        </tr>
      </thead>
      <tbody>
        {sops.map((sop) => (
          <tr key={sop.id} className="border-b last:border-0 hover:bg-gray-50">
            <td className="px-4 py-3 font-mono text-xs text-gray-600">
              {sop.document_number}
            </td>
            <td className="px-4 py-3">
              <Link href={`/sop/${sop.id}`} className="font-medium text-gray-900 hover:underline">
                {sop.title}
              </Link>
            </td>
            <td className="px-4 py-3 text-gray-600">{sop.category?.name ?? '-'}</td>
            <td className="px-4 py-3 text-gray-600">
              {sop.current_version ? `v${sop.current_version.version_number}` : '-'}
            </td>
            <td className="px-4 py-3">
              <SopStatusBadge status={sop.status} />
            </td>
            <td className="px-4 py-3 text-gray-600">
              {sop.current_version?.valid_until ?? '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
