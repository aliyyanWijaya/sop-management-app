// Tipe data dasar yang dipakai di banyak komponen — dipusatkan di sini
// supaya kalau struktur database berubah, cukup update 1 file ini.

export type UserRole = 'staff' | 'document_controller' | 'admin'

export type CurrentUser = {
  id: string
  name: string
  email: string
  role: UserRole
  department_id: string | null
}

export type SopStatus =
  | 'draft'
  | 'in_review'
  | 'in_approval'
  | 'published'
  | 'expired'
  | 'superseded'

export type SopListItem = {
  id: string
  title: string
  document_number: string
  status: SopStatus
  category: { id: string; name: string } | null
  current_version: {
    id: string
    version_number: number
    valid_until: string | null
  } | null
}
