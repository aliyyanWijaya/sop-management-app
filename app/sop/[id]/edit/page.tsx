import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateSopContent } from "./actions";
import { Button } from "@/components/ui/Button";

// Step 2b: edit form for the Purpose & Scope sections.
// Other sections (references, definitions, roles, procedure, appendices)
// are added here incrementally in steps 2c and 2d — this page's pattern
// (fetch existing content → render field → server action merge & save)
// stays the same, just with more fields.
export default async function EditSopPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const searchParamsResolved = await searchParams;
  const supabase = await createClient();

  const { data: sop } = await supabase
    .from("sops")
    .select(
      `
      id, title, document_number, status,
      current_version:sop_versions!fk_sops_current_version ( id, content, status )
    `,
    )
    .eq("id", id)
    .single();

  if (!sop) {
    // RLS already blocks access if the current user isn't an author/
    // reviewer/approver — so notFound() here doubles as an access guard.
    notFound();
  }

  const version = Array.isArray(sop.current_version)
    ? sop.current_version[0]
    : sop.current_version;

  if (!version) {
    notFound();
  }

  const canEdit = version!.status === "draft";
  const content = version!.content ?? {};

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <p className="font-mono text-xs text-gray-500">{sop.document_number}</p>
        <h1 className="text-xl font-semibold">Edit: {sop.title}</h1>
      </div>

      {searchParamsResolved.error && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">
          {searchParamsResolved.error}
        </p>
      )}

      {!canEdit && (
        <p className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">
          This SOP is already &quot;{version!.status}&quot; — it can no longer
          be edited from this page.
        </p>
      )}

      {canEdit && (
        <form action={updateSopContent} className="flex flex-col gap-4">
          <input type="hidden" name="sop_id" value={sop.id} />
          <input type="hidden" name="sop_version_id" value={version!.id} />

          <div>
            <label className="mb-1 block text-sm font-medium">
              1.0 Purpose{" "}
              <span className="text-gray-400">
                (intent of this document, 1-2 sentences)
              </span>
            </label>
            <textarea
              name="purpose"
              defaultValue={content.purpose ?? ""}
              required
              rows={2}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="e.g. Defines the process for inspecting raw materials before they enter the warehouse."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              2.0 Scope — Applies to
            </label>
            <textarea
              name="scope_applies_to"
              defaultValue={content.scope?.applies_to ?? ""}
              required
              rows={2}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="e.g. All QA staff at Plant X handling incoming raw materials."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              2.0 Scope — Does not apply to{" "}
              <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              name="scope_excludes"
              defaultValue={content.scope?.excludes ?? ""}
              rows={2}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="e.g. Does not apply to imported raw materials (see SOP-QA-005)."
            />
          </div>

          <Button type="submit" className="mt-2 w-fit">
            Save
          </Button>
        </form>
      )}
    </div>
  );
}
