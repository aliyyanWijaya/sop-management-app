import { createClient } from "@/lib/supabase/server";
import { createSopDraft } from "./actions";
import { Button } from "@/components/ui/Button";

// Step 2a: simplest possible form — just title, document_number, category.
// Other sections (purpose, scope, procedure, etc.) are added on the SOP
// detail/edit page once the draft exists (steps 2b onwards).
export default async function NewSopPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // sop_categories is readable by any logged-in user (see RLS policy
  // "categories_select_all")
  const { data: categories } = await supabase
    .from("sop_categories")
    .select("id, name")
    .order("name");

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">New SOP</h1>

      {params.error && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">
          {params.error}
        </p>
      )}

      {(!categories || categories.length === 0) && (
        <p className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">
          No SOP categories yet. Ask a Document Controller to add one under
          Master Data before creating a new SOP.
        </p>
      )}

      <form action={createSopDraft} className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Document Number
          </label>
          <input
            name="document_number"
            type="text"
            placeholder="e.g. SOP-QA-001"
            required
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">SOP Title</label>
          <input
            name="title"
            type="text"
            placeholder="e.g. Raw Material Inspection Procedure"
            required
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Category</label>
          <select
            name="category_id"
            required
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">Select a category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="submit"
          disabled={!categories || categories.length === 0}
          className="mt-2 w-fit"
        >
          Create Draft
        </Button>
      </form>
    </div>
  );
}
