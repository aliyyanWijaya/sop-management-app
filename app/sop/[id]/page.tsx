import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SopStatusBadge } from "@/components/sop/SopStatusBadge";
import { LinkButton } from "@/components/ui/Button";
import type { SopStatus } from "@/lib/types";

// Early version of the detail page — just enough to verify the result of
// the authoring form (2a/2b). Remaining sections (references, definitions,
// roles, procedure, appendices) and review/approval actions are added in
// later steps.
export default async function SopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: sop } = await supabase
    .from("sops")
    .select(
      `
      id, title, document_number, status,
      category:sop_categories ( name ),
      current_version:sop_versions!fk_sops_current_version (
        id, version_number, status, content, author_id
      )
    `,
    )
    .eq("id", id)
    .single();

  if (!sop) {
    // RLS makes the query above return null if the current user isn't a
    // stakeholder and the SOP isn't published yet — so notFound() here
    // doubles as an access guard, not just a "data missing" case.
    notFound();
  }

  const version = Array.isArray(sop.current_version)
    ? sop.current_version[0]
    : sop.current_version;
  const category = Array.isArray(sop.category) ? sop.category[0] : sop.category;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-gray-500">
            {sop.document_number}
          </p>
          <h1 className="text-xl font-semibold">{sop.title}</h1>
          <p className="text-sm text-gray-500">{category?.name ?? "-"}</p>
        </div>
        <SopStatusBadge status={sop.status as SopStatus} />
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <p className="text-sm text-gray-500">
          Version {version?.version_number ?? "-"} — status:{" "}
          {version?.status ?? "-"}
        </p>
        <p className="text-sm">
          <span className="font-medium">Purpose: </span>
          {version?.content?.purpose || (
            <span className="italic text-gray-400">not filled in yet</span>
          )}
        </p>
        <p className="text-sm">
          <span className="font-medium">Scope — Applies to: </span>
          {version?.content?.scope?.applies_to || (
            <span className="italic text-gray-400">not filled in yet</span>
          )}
        </p>
        {version?.content?.scope?.excludes && (
          <p className="text-sm">
            <span className="font-medium">Scope — Does not apply to: </span>
            {version.content.scope.excludes}
          </p>
        )}

        {version?.content?.references?.length > 0 && (
          <div className="text-sm">
            <p className="font-medium">3.0 References & Related Documents</p>
            <ul className="ml-4 list-disc text-gray-700">
              {version.content.references.map(
                (ref: { title: string; doc_number: string }, i: number) => (
                  <li key={i}>
                    {ref.title} {ref.doc_number && `(${ref.doc_number})`}
                  </li>
                ),
              )}
            </ul>
          </div>
        )}

        {version?.content?.definitions?.length > 0 && (
          <div className="text-sm">
            <p className="font-medium">4.0 Definitions</p>
            <ul className="ml-4 list-disc text-gray-700">
              {version.content.definitions.map(
                (def: { term: string; definition: string }, i: number) => (
                  <li key={i}>
                    <span className="font-medium">{def.term}</span>:{" "}
                    {def.definition}
                  </li>
                ),
              )}
            </ul>
          </div>
        )}

        {version?.content?.roles_responsibilities?.length > 0 && (
          <div className="text-sm">
            <p className="font-medium">5.0 Roles and Responsibilities</p>
            <ul className="ml-4 list-disc text-gray-700">
              {version.content.roles_responsibilities.map(
                (r: { role: string; responsibility: string }, i: number) => (
                  <li key={i}>
                    <span className="font-medium">{r.role}</span>:{" "}
                    {r.responsibility}
                  </li>
                ),
              )}
            </ul>
          </div>
        )}

        {version?.status === "draft" && (
          <LinkButton href={`/sop/${sop.id}/edit`}>Edit</LinkButton>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Remaining sections (procedure, appendices) are added incrementally in
        later steps.
      </p>
    </div>
  );
}
