import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { getCurrentUser } from '@/lib/get-current-user'

// Layout ini otomatis berlaku untuk /sop, /sop/new, /sop/[id], dst —
// jadi Sidebar & Header cuma ditulis SEKALI di sini, bukan diulang
// di tiap page. getCurrentUser() juga cuma dipanggil sekali di sini,
// bukan di tiap page anak (page anak tinggal query data SOP-nya saja).
export default async function SopLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  // Middleware sudah handle redirect kalau belum login sama sekali,
  // tapi ini jaga-jaga kalau baris di tabel `users` belum ada
  // (misal trigger signup gagal) — jangan render halaman dengan user null.
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen">
      <Sidebar role={user.role} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  )
}
