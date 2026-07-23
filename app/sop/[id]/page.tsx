import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SopStatusBadge } from "@/components/sop/SopStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { submitForReview } from "./actions";
import type { SopStatus } from "@/lib/types";

export default async function SopDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
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
  const content = version?.content ?? {};
  const isDraft = version?.status === "draft";

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            {sop.document_number}
          </p>
          <h1 className="text-xl font-semibold">{sop.title}</h1>
          <p className="text-sm text-muted-foreground">
            {category?.name ?? "-"}
          </p>
        </div>
        <SopStatusBadge status={sop.status as SopStatus} />
      </div>

      {error && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Version {version?.version_number ?? "-"} — {version?.status ?? "-"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            <span className="font-medium">1.0 Purpose: </span>
            {content.purpose || (
              <span className="italic text-muted-foreground">
                not filled in yet
              </span>
            )}
          </p>

          <Separator />

          <p className="text-sm">
            <span className="font-medium">2.0 Scope — Applies to: </span>
            {content.scope?.applies_to || (
              <span className="italic text-muted-foreground">
                not filled in yet
              </span>
            )}
          </p>
          {content.scope?.excludes && (
            <p className="text-sm">
              <span className="font-medium">Scope — Does not apply to: </span>
              {content.scope.excludes}
            </p>
          )}

          {content.references?.length > 0 && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="font-medium">
                  3.0 References &amp; Related Documents
                </p>
                <ul className="ml-4 list-disc text-muted-foreground">
                  {content.references.map(
                    (ref: { title: string; doc_number: string }, i: number) => (
                      <li key={i}>
                        {ref.doc_number && `${ref.doc_number} — `}
                        {ref.title}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </>
          )}

          {content.definitions?.length > 0 && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="font-medium">4.0 Definitions</p>
                <ul className="ml-4 list-disc text-muted-foreground">
                  {content.definitions.map(
                    (def: { term: string; definition: string }, i: number) => (
                      <li key={i}>
                        <span className="font-medium text-foreground">
                          {def.term}
                        </span>
                        : {def.definition}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </>
          )}

          {content.roles_responsibilities?.length > 0 && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="font-medium">5.0 Roles and Responsibilities</p>
                <ul className="ml-4 list-disc text-muted-foreground">
                  {content.roles_responsibilities.map(
                    (
                      r: { role: string; responsibility: string },
                      i: number,
                    ) => (
                      <li key={i}>
                        <span className="font-medium text-foreground">
                          {r.role}
                        </span>
                        : {r.responsibility}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </>
          )}

          {content.procedure?.length > 0 && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="font-medium">6.0 Procedure</p>
                <ol className="ml-4 list-decimal space-y-2 text-muted-foreground">
                  {content.procedure.map(
                    (
                      step: {
                        major_step: string;
                        actions: string[];
                        notes: string[];
                      },
                      i: number,
                    ) => (
                      <li key={i}>
                        <span className="font-medium text-foreground">
                          {step.major_step}
                        </span>
                        {step.actions?.length > 0 && (
                          <ul className="ml-4 list-disc">
                            {step.actions.map((action, j) => (
                              <li key={j}>{action}</li>
                            ))}
                          </ul>
                        )}
                        {step.notes?.length > 0 && (
                          <p className="mt-1 text-xs italic">
                            Note: {step.notes.join(" • ")}
                          </p>
                        )}
                      </li>
                    ),
                  )}
                </ol>
              </div>
            </>
          )}

          {content.appendices?.length > 0 && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="font-medium">7.0 Appendices</p>
                <ul className="ml-4 list-disc text-muted-foreground">
                  {content.appendices.map(
                    (
                      a: {
                        type: string;
                        description: string;
                        file_url: string;
                      },
                      i: number,
                    ) => (
                      <li key={i}>
                        {a.description} {a.type && `(${a.type})`}
                        {a.file_url && (
                          <>
                            {" — "}
                            <a
                              href={a.file_url}
                              className="underline"
                              target="_blank"
                            >
                              view
                            </a>
                          </>
                        )}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </>
          )}

          {isDraft && (
            <>
              <Separator />
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  asChild
                  className="cursor-pointer transition-transform active:scale-95"
                >
                  <Link href={`/sop/${sop.id}/edit`}>Edit</Link>
                </Button>

                <form action={submitForReview}>
                  <input type="hidden" name="sop_id" value={sop.id} />
                  <input
                    type="hidden"
                    name="sop_version_id"
                    value={version!.id}
                  />
                  <Button
                    type="submit"
                    className="cursor-pointer transition-transform active:scale-95"
                  >
                    Submit for Review
                  </Button>
                </form>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
