import type { SopStatus } from '@/lib/types'

const STATUS_STYLE: Record<SopStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_review: 'bg-yellow-100 text-yellow-800',
  in_approval: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  superseded: 'bg-gray-100 text-gray-500 line-through',
}

const STATUS_LABEL: Record<SopStatus, string> = {
  draft: 'Draft',
  in_review: 'Menunggu Review',
  in_approval: 'Menunggu Approval',
  published: 'Aktif',
  expired: 'Kadaluarsa',
  superseded: 'Digantikan',
}

export function SopStatusBadge({ status }: { status: SopStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
