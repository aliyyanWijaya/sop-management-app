import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateSopContent } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DynamicListEditor } from "@/components/sop/DynamicListEditor";
import { ProcedureEditor } from "@/components/sop/ProcedureEditor";
import { QuizEditor } from "@/components/sop/QuizEditor";

// Full authoring form: Title, Purpose, Scope, References, Definitions,
// Roles & Responsibilities, Procedure (nested major steps), and
// Appendices — all sections of the SOP template are covered. Fetch
// existing content → render fields → server action merges & saves back.
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

  const { data: quizQuestions } = await supabase
    .from("quiz_questions")
    .select("question_text, options, correct_option")
    .eq("sop_version_id", version!.id);

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit: {sop.title}</CardTitle>
          <p className="font-mono text-xs text-muted-foreground">
            {sop.document_number}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {searchParamsResolved.error && (
            <p className="rounded bg-red-50 p-3 text-sm text-red-700">
              {searchParamsResolved.error}
            </p>
          )}

          {!canEdit && (
            <p className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">
              This SOP is already &quot;{version!.status}&quot; — it can no
              longer be edited from this page.
            </p>
          )}

          {canEdit && (
            <form action={updateSopContent} className="flex flex-col gap-4">
              <input type="hidden" name="sop_id" value={sop.id} />
              <input type="hidden" name="sop_version_id" value={version!.id} />

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Document Number
                </label>
                <Input type="text" value={sop.document_number} disabled />
                <p className="mt-1 text-xs text-muted-foreground">
                  Auto-assigned per department and reserved — cannot be changed.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  SOP Title
                </label>
                <Input
                  name="title"
                  type="text"
                  defaultValue={sop.title}
                  required
                />
              </div>

              <Separator />

              <div>
                <label className="mb-1 block text-sm font-medium">
                  1.0 Purpose{" "}
                  <span className="text-muted-foreground">
                    (intent of this document, 1-2 sentences)
                  </span>
                </label>
                <Textarea
                  name="purpose"
                  defaultValue={content.purpose ?? ""}
                  required
                  rows={2}
                  placeholder="e.g. Defines the process for inspecting raw materials before they enter the warehouse."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  2.0 Scope — Applies to
                </label>
                <Textarea
                  name="scope_applies_to"
                  defaultValue={content.scope?.applies_to ?? ""}
                  required
                  rows={2}
                  placeholder="e.g. All QA staff at Plant X handling incoming raw materials."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  2.0 Scope — Does not apply to{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  name="scope_excludes"
                  defaultValue={content.scope?.excludes ?? ""}
                  rows={2}
                  placeholder="e.g. Does not apply to imported raw materials (see SOP-QA-005)."
                />
              </div>

              <Separator />

              <DynamicListEditor
                name="references_json"
                title="3.0 References & Related Documents"
                fields={[
                  {
                    key: "doc_number",
                    label: "Doc. Number",
                    placeholder: "e.g. SOP-QA-002",
                  },
                  {
                    key: "title",
                    label: "Title",
                    placeholder: "e.g. SOP-QA-002 Equipment Calibration",
                  },
                ]}
                initialItems={content.references ?? []}
                addLabel="Add reference"
              />

              <Separator />

              <DynamicListEditor
                name="definitions_json"
                title="4.0 Definitions"
                fields={[
                  { key: "term", label: "Term", placeholder: "e.g. CAPA" },
                  {
                    key: "definition",
                    label: "Definition",
                    placeholder: "e.g. Corrective and Preventive Action",
                  },
                ]}
                initialItems={content.definitions ?? []}
                addLabel="Add definition"
              />

              <Separator />

              <DynamicListEditor
                name="roles_responsibilities_json"
                title="5.0 Roles and Responsibilities"
                fields={[
                  {
                    key: "role",
                    label: "Role",
                    placeholder: "e.g. QA Officer",
                  },
                  {
                    key: "responsibility",
                    label: "Responsibility",
                    placeholder: "e.g. Performs daily equipment checks",
                  },
                ]}
                initialItems={content.roles_responsibilities ?? []}
                addLabel="Add role"
              />

              <Separator />

              <ProcedureEditor
                name="procedure_json"
                initialSteps={content.procedure ?? []}
              />

              <Separator />

              <DynamicListEditor
                name="appendices_json"
                title="7.0 Appendices"
                fields={[
                  { key: "type", label: "Type", placeholder: "e.g. flowchart" },
                  {
                    key: "description",
                    label: "Description",
                    placeholder: "e.g. Inspection flow diagram",
                  },
                  {
                    key: "file_url",
                    label: "File URL",
                    placeholder: "e.g. https://...",
                  },
                ]}
                initialItems={content.appendices ?? []}
                addLabel="Add appendix"
              />

              <Separator />

              <QuizEditor
                name="quiz_questions_json"
                initialQuestions={quizQuestions ?? []}
              />

              <Button
                type="submit"
                className="mt-2 w-fit cursor-pointer transition-transform active:scale-95"
              >
                Save
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
