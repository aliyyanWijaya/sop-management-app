import { createClient } from "@/lib/supabase/server";
import { SopTable } from "@/components/sop/SopTable";
import type { SopListItem } from "@/lib/types";

// Server Component murni — query langsung di sini, tidak perlu useEffect
// atau loading state manual. RLS di database yang otomatis membatasi
// baris mana saja yang kebaca sesuai role user yang login.
export default async function SopListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("sops")
    .select(
      `
      id,
      title,
      document_number,
      status,
      category:sop_categories ( id, name ),
      current_version:sop_versions!fk_sops_current_version (
        id, version_number, valid_until
      )
    `,
    )
    .order("created_at", { ascending: false });

  // The header's SearchBar links here with ?q=... — match against title
  // or document_number, case-insensitive partial match. Strip characters
  // that have special meaning in PostgREST's filter syntax (`,` `(` `)`)
  // so a stray character in the search box can't break the query string.
  const term = q?.trim().replace(/[,()]/g, "");
  if (term) {
    query = query.or(`title.ilike.%${term}%,document_number.ilike.%${term}%`);
  }

  const { data, error } = await query;

  if (error) {
    // Kondisi ini seharusnya jarang terjadi (RLS menahan lewat kosongnya
    // data, bukan error) — tapi tetap ditangani biar tidak crash diam-diam.
    return (
      <p className="rounded bg-red-50 p-4 text-sm text-red-700">
        Failed to load SOP list: {error.message}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">SOP List</h1>
      </div>

      {term && (
        <p className="text-sm text-muted-foreground">
          Showing results for &quot;{term}&quot; ({data?.length ?? 0} found)
        </p>
      )}

      <SopTable sops={(data ?? []) as unknown as SopListItem[]} />
    </div>
  );
}
