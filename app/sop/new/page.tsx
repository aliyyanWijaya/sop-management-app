import { createClient } from '@/lib/supabase/server'
import { createSopDraft } from './actions'

// Step 2a: form paling sederhana — cuma title, document_number, category.
// Section lain (purpose, scope, procedure, dst) ditambahkan di halaman
// detail/edit SOP setelah draft-nya tercipta (langkah 2b dan seterusnya).
export default async function NewSopPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // sop_categories boleh dibaca semua user login (lihat RLS "categories_select_all")
  const { data: categories } = await supabase
    .from('sop_categories')
    .select('id, name')
    .order('name')

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Buat SOP Baru</h1>

      {params.error && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">{params.error}</p>
      )}

      {(!categories || categories.length === 0) && (
        <p className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">
          Belum ada kategori SOP. Minta Document Controller untuk menambahkan kategori
          dulu di Master Data sebelum bisa membuat SOP baru.
        </p>
      )}

      <form action={createSopDraft} className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Nomor Dokumen</label>
          <input
            name="document_number"
            type="text"
            placeholder="mis. SOP-QA-001"
            required
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Judul SOP</label>
          <input
            name="title"
            type="text"
            placeholder="mis. Prosedur Inspeksi Bahan Baku"
            required
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Kategori</label>
          <select
            name="category_id"
            required
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">Pilih kategori</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!categories || categories.length === 0}
          className="mt-2 rounded bg-black py-2 text-sm text-white disabled:opacity-40"
        >
          Buat Draft
        </button>
      </form>
    </div>
  )
}
