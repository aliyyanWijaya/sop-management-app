// Taruh di: app/sop/[id]/page.tsx  (replace file yang lama)
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { SopStatusBadge } from "@/components/sop/SopStatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  TitleBlock,
  PurposeBlock,
  ScopeBlock,
  ReferencesBlock,
  DefinitionsBlock,
  RolesBlock,
  ProcedureBlock,
  AppendicesBlock,
} from "@/components/sop/SopEditableBlocks";
import {
  submitForReview,
  reviewerDecision,
  approverDecision,
  softDeleteSop,
  createRevision,
} from "./actions";
import {
  updateTitleBlock,
  updatePurposeBlock,
  updateScopeBlock,
  updateReferencesBlock,
  updateDefinitionsBlock,
  updateRolesBlock,
  updateProcedureBlock,
  updateAppendicesBlock,
} from "./block-actions";
import type { SopStatus } from "@/lib/types";
import {
  CheckCircle2,
  Clock,
  Send,
  Printer,
  History,
  Trash2,
  User,
} from "lucide-react";

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
        id, version_number, status, content, author_id, reviewer_id, approver_id,
        created_at, reviewed_at, approved_at, published_at
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

  const currentUser = await getCurrentUser();

  const version = Array.isArray(sop.current_version)
    ? sop.current_version[0]
    : sop.current_version;
  const category = Array.isArray(sop.category) ? sop.category[0] : sop.category;
  const content = version?.content ?? {};

  const isDraft = version?.status === "draft";
  const isAuthor = currentUser?.id === version?.author_id;
  const isAdminOrDc =
    currentUser?.role === "admin" ||
    currentUser?.role === "document_controller";

  // Satu-satunya syarat block bisa diklik-edit: masih draft, dan yang
  // login adalah author atau admin/document_controller. RLS di database
  // tetap jadi pertahanan terakhir (lihat block-actions.ts).
  const canEditContent = isDraft && (isAuthor || isAdminOrDc);

  const canAssignSocialization =
    sop.status === "published" && (isAuthor || isAdminOrDc);
  const isAwaitingThisReviewer =
    version?.status === "in_review" && currentUser?.id === version?.reviewer_id;
  const isAwaitingThisApprover =
    version?.status === "in_approval" &&
    currentUser?.id === version?.approver_id;
  const canStartRevision =
    sop.status === "published" && (isAuthor || isAdminOrDc);
  const canDelete = (isDraft && isAuthor) || isAdminOrDc;

  // Nama + jabatan author/reviewer/approver — dipakai di tabel workflow
  // status, sama seperti di halaman print.
  const stakeholderIds = [
    version?.author_id,
    version?.reviewer_id,
    version?.approver_id,
  ].filter((v): v is string => Boolean(v));

  const { data: stakeholders } =
    stakeholderIds.length > 0
      ? await supabase
          .from("users")
          .select("id, name, position_title")
          .in("id", stakeholderIds)
      : {
          data: [] as {
            id: string;
            name: string;
            position_title: string | null;
          }[],
        };

  const findUser = (uid?: string | null) =>
    stakeholders?.find((u) => u.id === uid);
  const author = findUser(version?.author_id);
  const reviewer = findUser(version?.reviewer_id);
  const approver = findUser(version?.approver_id);

  const { data: history } = await supabase
    .from("approval_actions")
    .select("action, comment, created_at, actor:users ( name )")
    .eq("sop_version_id", version?.id ?? "")
    .order("created_at", { ascending: true });

  // en-NZ rather than id-ID, to match the project's English/NZ convention.
  const fmt = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("en-NZ") : "-";

  // Approval workflow summary — a glanceable Role / Personnel Name / Date /
  // Status table matching the Visily mockup, distinct from the detailed
  // Activity Log further down (which keeps every action + comment).
  const workflowRows = [
    {
      role: "Created By",
      name: author?.name ?? "-",
      subtitle: author?.position_title ?? null,
      date: fmt(version?.created_at),
      completed: true,
    },
    {
      role: "Reviewed By",
      name: reviewer?.name ?? "Not assigned",
      subtitle: reviewer?.position_title ?? null,
      date: fmt(version?.reviewed_at),
      completed: Boolean(version?.reviewed_at),
    },
    {
      role: "Approved By",
      name: approver?.name ?? "Not assigned",
      subtitle: approver?.position_title ?? null,
      date: fmt(version?.approved_at),
      completed: Boolean(version?.approved_at),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Breadcrumb + inline-edit hint row */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Link href="/sop" className="hover:text-foreground hover:underline">
            SOP List
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">
            {isDraft ? "SOP Editor" : sop.title}
          </span>
        </div>
        {canEditContent && (
          <p className="flex items-center gap-1.5 text-xs italic text-muted-foreground">
            <Clock className="size-3.5" />
            Click on any block to edit. Changes are saved automatically.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <Card>
        <CardContent className="space-y-5 pt-6">
          {/* Header block */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <SopStatusBadge status={sop.status as SopStatus} />
                <span className="font-mono text-xs text-muted-foreground">
                  {sop.document_number}
                </span>
              </div>
              <div className="text-2xl font-semibold tracking-tight">
                <TitleBlock
                  title={sop.title}
                  editable={canEditContent}
                  onSave={updateTitleBlock.bind(null, sop.id, version!.id)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {category?.name ?? "-"}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2 text-right">
              <div className="flex gap-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Version
                  </p>
                  <p className="text-sm font-medium">
                    v{version?.version_number ?? "-"}
                    {isDraft && " (Draft)"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Date
                  </p>
                  <p className="text-sm font-medium">
                    {fmt(version?.published_at ?? version?.created_at)}
                  </p>
                </div>
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="size-3.5" />
                Document Control
              </p>
            </div>
          </div>

          <Separator />

          {/* Approval workflow summary table */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Approval History
            </p>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Personnel Name</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workflowRows.map((row) => (
                    <tr key={row.role} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{row.role}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.name}
                        {row.subtitle && (
                          <span className="block text-xs text-muted-foreground/80">
                            {row.subtitle}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.date}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.completed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                            <CheckCircle2 className="size-3.5" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                            <Clock className="size-3.5" />
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Editable content blocks — unchanged from what you had; only
              the surrounding chrome above/below was restyled. */}
          <div className="space-y-4">
            <PurposeBlock
              purpose={content.purpose ?? ""}
              editable={canEditContent}
              onSave={updatePurposeBlock.bind(null, sop.id, version!.id)}
            />
            <Separator />
            <ScopeBlock
              appliesTo={content.scope?.applies_to ?? ""}
              excludes={content.scope?.excludes ?? ""}
              editable={canEditContent}
              onSave={updateScopeBlock.bind(null, sop.id, version!.id)}
            />
            <Separator />
            <ReferencesBlock
              references={content.references ?? []}
              editable={canEditContent}
              onSave={updateReferencesBlock.bind(null, sop.id, version!.id)}
            />
            <Separator />
            <DefinitionsBlock
              definitions={content.definitions ?? []}
              editable={canEditContent}
              onSave={updateDefinitionsBlock.bind(null, sop.id, version!.id)}
            />
            <Separator />
            <RolesBlock
              roles={content.roles_responsibilities ?? []}
              editable={canEditContent}
              onSave={updateRolesBlock.bind(null, sop.id, version!.id)}
            />
            <Separator />
            <ProcedureBlock
              procedure={content.procedure ?? []}
              editable={canEditContent}
              onSave={updateProcedureBlock.bind(null, sop.id, version!.id)}
            />
            <Separator />
            <AppendicesBlock
              appendices={content.appendices ?? []}
              editable={canEditContent}
              onSave={updateAppendicesBlock.bind(null, sop.id, version!.id)}
            />
          </div>

          <Separator />

          {/* Draft action row */}
          {isDraft && (
            <div className="flex flex-wrap items-center gap-2">
              <form action={submitForReview}>
                <input type="hidden" name="sop_id" value={sop.id} />
                <input
                  type="hidden"
                  name="sop_version_id"
                  value={version!.id}
                />
                <Button
                  type="submit"
                  className="cursor-pointer gap-1.5 transition-transform active:scale-95"
                >
                  <Send className="size-4" />
                  Submit for Review
                </Button>
              </form>

              <Link
                href="/sop"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
              >
                Cancel
              </Link>
            </div>
          )}

          {isAwaitingThisReviewer && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Review Decision</p>
              <form action={reviewerDecision} className="space-y-2">
                <input type="hidden" name="sop_id" value={sop.id} />
                <input
                  type="hidden"
                  name="sop_version_id"
                  value={version!.id}
                />
                <Textarea
                  name="comment"
                  placeholder="Optional comment (required if requesting revision)"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    name="decision"
                    value="approve"
                    className="cursor-pointer transition-transform active:scale-95"
                  >
                    Approve Review
                  </Button>
                  <Button
                    type="submit"
                    name="decision"
                    value="request_revision"
                    variant="outline"
                    className="cursor-pointer transition-transform active:scale-95"
                  >
                    Request Revision
                  </Button>
                </div>
              </form>
            </div>
          )}

          {isAwaitingThisApprover && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Approval Decision</p>
              <form action={approverDecision} className="space-y-2">
                <input type="hidden" name="sop_id" value={sop.id} />
                <input
                  type="hidden"
                  name="sop_version_id"
                  value={version!.id}
                />
                <Textarea
                  name="comment"
                  placeholder="Optional comment (required if rejecting)"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    name="decision"
                    value="approve"
                    className="cursor-pointer transition-transform active:scale-95"
                  >
                    Approve &amp; Publish
                  </Button>
                  <Button
                    type="submit"
                    name="decision"
                    value="reject"
                    variant="destructive"
                    className="cursor-pointer transition-transform active:scale-95"
                  >
                    Reject
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Footer utility row */}
          {history && history.length > 0 && (
            <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
              <a
                href="#activity-log"
                className="flex items-center gap-1 hover:text-foreground hover:underline"
              >
                <History className="size-3.5" />
                View Change Log
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {canAssignSocialization && (
        <Link
          href={`/sop/${sop.id}/assign`}
          className={
            buttonVariants({ variant: "outline" }) +
            " w-fit cursor-pointer transition-transform active:scale-95"
          }
        >
          Assign Socialization &amp; Quiz
        </Link>
      )}

      {canStartRevision && (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-2 text-base font-medium">Make new Revision</p>
            <form action={createRevision} className="space-y-2">
              <input type="hidden" name="sop_id" value={sop.id} />
              <label className="block text-sm font-medium">
                Explain change that is being made in this revision (required)
              </label>
              <Textarea
                name="change_summary"
                required
                rows={2}
                placeholder="add the flow process"
              />
              <Button
                type="submit"
                className="cursor-pointer transition-transform active:scale-95"
              >
                Make revision (v{(version?.version_number ?? 1) + 1})
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Detailed audit log — every action + comment, kept separate from
          the glanceable workflow summary table above. */}
      {history && history.length > 0 && (
        <Card id="activity-log">
          <CardContent className="pt-6">
            <p className="mb-2 text-sm font-medium">Activity Log</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {history.map((h, i) => {
                const actor = Array.isArray(h.actor) ? h.actor[0] : h.actor;
                return (
                  <li key={i}>
                    <span className="font-medium text-foreground">
                      {actor?.name ?? "Unknown"}
                    </span>{" "}
                    — {h.action.replace("_", " ")}
                    {h.comment && <> — &quot;{h.comment}&quot;</>}
                    <span className="ml-1">
                      ({new Date(h.created_at).toLocaleString("en-NZ")})
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Delete SOP + Print/PDF row */}
      <div className="flex items-center justify-between">
        {canDelete ? (
          <form action={softDeleteSop}>
            <input type="hidden" name="sop_id" value={sop.id} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="cursor-pointer gap-1.5 text-destructive transition-transform hover:text-destructive active:scale-95"
            >
              <Trash2 className="size-4" />
              Delete SOP
            </Button>
          </form>
        ) : (
          <span />
        )}

        <Link
          href={`/sop/${sop.id}/print`}
          target="_blank"
          className={
            buttonVariants({ variant: "outline", size: "sm" }) +
            " gap-1.5 cursor-pointer transition-transform active:scale-95"
          }
        >
          <Printer className="size-4" />
          Print / PDF
        </Link>
      </div>
    </div>
  );
}
