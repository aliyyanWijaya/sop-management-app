"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SopStatusBadge } from "@/components/sop/SopStatusBadge";
import { getSopPreview, type SopPreviewData } from "@/app/sop/ai-chat/actions";
import type { SopStatus } from "@/lib/types";

export type SopPreviewTarget = {
  sopId: string;
  documentNumber: string;
  sectionLabel: string;
  quote: string;
};

type HighlightKey =
  | "purpose"
  | "scope"
  | "references"
  | "definitions"
  | "roles"
  | "procedure";

type HighlightTarget = { key: HighlightKey; stepIndex?: number };

// Maps a citation's section_label (copied verbatim from the SOP content
// chunks — see regenerate_sop_content_chunks() in sql/010) back to the
// content field it came from, so we know what to highlight.
function parseHighlightTarget(sectionLabel: string): HighlightTarget | null {
  const label = sectionLabel.toLowerCase();
  if (label.startsWith("1.0 purpose")) return { key: "purpose" };
  if (label.startsWith("2.0 scope")) return { key: "scope" };
  if (label.startsWith("3.0 references")) return { key: "references" };
  if (label.startsWith("4.0 definitions")) return { key: "definitions" };
  if (label.startsWith("5.0 roles")) return { key: "roles" };
  if (label.startsWith("6.0 procedure")) {
    const match = sectionLabel.match(/step\s+(\d+)/i);
    return {
      key: "procedure",
      stepIndex: match ? parseInt(match[1], 10) : undefined,
    };
  }
  // 7.0 Appendices has no chunk/section_label today, so it's never a
  // citation target — nothing to match there.
  return null;
}

const HIGHLIGHT_CLASS =
  "rounded-md bg-amber-100 ring-1 ring-amber-300 -mx-2 -my-1 px-2 py-1";

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("en-GB") : "-";
}

export function SopPreviewPanel({
  target,
  onClose,
}: {
  target: SopPreviewTarget;
  onClose: () => void;
}) {
  const [data, setData] = useState<SopPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const highlightElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setData(null);
    highlightElRef.current = null;

    getSopPreview(target.sopId).then((result) => {
      if (cancelled) return;
      if (!result) setNotFound(true);
      else setData(result);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [target.sopId]);

  // Scroll the matching section into view once content has rendered.
  useEffect(() => {
    if (!loading && data) {
      highlightElRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [loading, data, target.sectionLabel]);

  const highlight = parseHighlightTarget(target.sectionLabel);

  function matches(key: HighlightKey, stepIndex?: number) {
    if (!highlight || highlight.key !== key) return false;
    if (highlight.key === "procedure") return highlight.stepIndex === stepIndex;
    return true;
  }

  function highlightProps(key: HighlightKey, stepIndex?: number) {
    const isMatch = matches(key, stepIndex);
    return {
      ref: isMatch
        ? (el: HTMLElement | null) => {
            highlightElRef.current = el;
          }
        : undefined,
      className: isMatch ? HIGHLIGHT_CLASS : "",
    };
  }
  const approvalRows = data?.version
    ? [
        {
          role: "Created By",
          name: data.version.author?.name ?? "-",
          date: data.version.created_at,
        },
        {
          role: "Reviewed By",
          name: data.version.reviewer?.name ?? null,
          date: data.version.reviewed_at,
        },
        {
          role: "Approved By",
          name: data.version.approver?.name ?? null,
          date: data.version.approved_at,
        },
      ]
    : [];
  const content = data?.version?.content ?? {};

  return (
    <Card className="relative flex h-full flex-col overflow-hidden">
      <Button
        variant="outline"
        size="icon"
        onClick={onClose}
        className="absolute right-3 top-3 z-10 size-8 cursor-pointer rounded-full border-2 border-red-500 text-red-600 hover:bg-red-50"
        aria-label="Close SOP preview"
      >
        <X className="size-4" />
      </Button>

      <div className="border-b p-4 pr-14">
        {loading && (
          <p className="text-sm text-muted-foreground">Loading SOP…</p>
        )}

        {data && (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <SopStatusBadge status={data.status as SopStatus} />
                <span className="font-mono text-xs text-muted-foreground">
                  {data.document_number}
                </span>
              </div>
              <CardTitle className="text-lg leading-tight">
                {data.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {data.category?.name ?? "-"}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <div className="flex gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Version
                  </p>
                  <p className="text-sm font-semibold">
                    v{data.version?.version_number ?? "-"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Date
                  </p>
                  <p className="text-sm font-semibold">
                    {formatDate(data.version?.published_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="size-3" />
                <span>{data.category?.name ?? "-"}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {data && approvalRows.length > 0 && (
        <div className="border-b p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Approval History
          </p>
          <div className="overflow-hidden rounded-md border">
            <div className="grid grid-cols-4 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span>Role</span>
              <span>Personnel Name</span>
              <span>Date</span>
              <span className="text-right">Status</span>
            </div>
            {approvalRows.map((row) => (
              <div
                key={row.role}
                className="grid grid-cols-4 items-center border-t px-3 py-2 text-sm"
              >
                <span className="font-medium">{row.role}</span>
                <span className="text-muted-foreground">{row.name ?? "-"}</span>
                <span className="text-muted-foreground">
                  {formatDate(row.date)}
                </span>
                <span className="flex items-center justify-end gap-1">
                  {row.date ? (
                    <>
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                      <span className="text-xs text-emerald-700">
                        Completed
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Pending
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <CardContent className="flex-1 space-y-3 overflow-y-auto py-4 text-sm">
        {notFound && (
          <p className="text-sm text-muted-foreground">
            This SOP could not be loaded. It may have been moved or is no longer
            published.
          </p>
        )}

        {data && (
          <>
            <div {...highlightProps("purpose")}>
              <p>
                <span className="font-medium">1.0 Purpose: </span>
                {content.purpose || (
                  <span className="italic text-muted-foreground">
                    not filled in yet
                  </span>
                )}
              </p>
            </div>

            <Separator />

            <div {...highlightProps("scope")}>
              <p>
                <span className="font-medium">2.0 Scope — Applies to: </span>
                {content.scope?.applies_to || (
                  <span className="italic text-muted-foreground">
                    not filled in yet
                  </span>
                )}
              </p>
              {content.scope?.excludes && (
                <p className="mt-1">
                  <span className="font-medium">
                    Scope — Does not apply to:{" "}
                  </span>
                  {content.scope.excludes}
                </p>
              )}
            </div>

            {content.references?.length > 0 && (
              <>
                <Separator />
                <div {...highlightProps("references")}>
                  <p className="font-medium">
                    3.0 References &amp; Related Documents
                  </p>
                  <ul className="ml-4 list-disc text-muted-foreground">
                    {content.references.map(
                      (
                        ref: { title: string; doc_number: string },
                        i: number,
                      ) => (
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
                <div {...highlightProps("definitions")}>
                  <p className="font-medium">4.0 Definitions</p>
                  <ul className="ml-4 list-disc text-muted-foreground">
                    {content.definitions.map(
                      (
                        def: { term: string; definition: string },
                        i: number,
                      ) => (
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
                <div {...highlightProps("roles")}>
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
                        <li key={i} {...highlightProps("procedure", i + 1)}>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
