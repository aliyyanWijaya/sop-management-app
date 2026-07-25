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

  // Nama + jabatan author/reviewer/approver — dipakai di tabel signers,
  // sama seperti di halaman print.
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

  const fmt = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("id-ID") : "-";

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <SopStatusBadge status={sop.status as SopStatus} />
        {canEditContent && (
          <p className="text-xs text-muted-foreground">
            Click on any block to edit. Changes are saved automatically.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <Card className="overflow-hidden p-0">
        {/* Header dokumen — mirip layout print, tapi title bisa diklik-edit */}
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b bg-muted/20">
              <td className="w-2/3 border-r px-4 py-3 align-top">
                <TitleBlock
                  title={sop.title}
                  editable={canEditContent}
                  onSave={updateTitleBlock.bind(null, sop.id, version!.id)}
                />
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {sop.document_number}
                </p>
                <p className="text-xs text-muted-foreground">
                  {category?.name ?? "-"}
                </p>
              </td>
              <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Version:</span>{" "}
                  v{version?.version_number ?? "-"} ({version?.status ?? "-"})
                </p>
                <p>
                  <span className="font-medium text-foreground">Date:</span>{" "}
                  {fmt(version?.published_at ?? version?.created_at)}
                </p>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Signers — read-only, sama seperti di halaman print (di-assign
            lewat alur review/approval, bukan diedit langsung di sini) */}
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="border-r px-2 py-1.5 font-medium">Created By</th>
              <th className="border-r px-2 py-1.5 font-medium">Reviewed By</th>
              <th className="px-2 py-1.5 font-medium">Approved By</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="border-r px-2 py-1.5">{author?.name ?? "-"}</td>
              <td className="border-r px-2 py-1.5">{reviewer?.name ?? "-"}</td>
              <td className="px-2 py-1.5">{approver?.name ?? "-"}</td>
            </tr>
            <tr className="text-muted-foreground">
              <td className="border-r px-2 py-1.5">
                {author?.position_title ?? "-"}
              </td>
              <td className="border-r px-2 py-1.5">
                {reviewer?.position_title ?? "-"}
              </td>
              <td className="px-2 py-1.5">{approver?.position_title ?? "-"}</td>
            </tr>
          </tbody>
        </table>

        <CardContent className="space-y-4 p-4">
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

          {isDraft && (
            <>
              <Separator />
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
            </>
          )}

          {isAwaitingThisReviewer && (
            <>
              <Separator />
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
            </>
          )}

          {isAwaitingThisApprover && (
            <>
              <Separator />
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
            </>
          )}

          {history && history.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium">Approval History</p>
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
                          ({new Date(h.created_at).toLocaleString()})
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {canAssignSocialization && (
        <Link
          href={`/sop/${sop.id}/assign`}
          className={buttonVariants({
            variant: "outline",
            className: "cursor-pointer transition-transform active:scale-95",
          })}
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

      {/* Delete — soft delete, tidak hilang dari database */}
      {canDelete && (
        <form action={softDeleteSop}>
          <input type="hidden" name="sop_id" value={sop.id} />
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            className="cursor-pointer transition-transform active:scale-95"
          >
            Delete SOP
          </Button>
        </form>
      )}

      <div className="flex items-start justify-between">
        <Link
          href={`/sop/${sop.id}/print`}
          target="_blank"
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "cursor-pointer transition-transform active:scale-95",
          })}
        >
          Print / PDF
        </Link>
      </div>
    </div>
  );
}
