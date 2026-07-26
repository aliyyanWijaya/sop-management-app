//app/sop/[id]/actions.ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// STUB — no real email provider is wired up yet. Replace this with a call
// to an actual transactional email service (e.g. Resend, Postmark, SES)
// once you have API credentials. For now this just logs, so the rest of
// the socialization flow (records, quiz, tracking) can be built and
// tested without depending on email infrastructure.
async function sendSocializationEmail(
  to: string,
  sopTitle: string,
  sopDocumentNumber: string,
) {
  console.log(
    `[stub email] To: ${to} — Subject: New SOP published: ${sopDocumentNumber} ${sopTitle}`,
  );
}

// Minimal validation before a draft is allowed to leave "draft" status —
// prevents an empty/near-empty SOP from ever reaching a reviewer.
function validateContentComplete(content: {
  purpose?: string;
  scope?: { applies_to?: string };
  procedure?: unknown[];
}) {
  if (!content.purpose?.trim())
    return "Purpose must be filled in before submitting.";
  if (!content.scope?.applies_to?.trim())
    return "Scope (applies to) must be filled in before submitting.";
  if (!content.procedure || content.procedure.length === 0)
    return "At least one Procedure step is required before submitting.";
  return null;
}

export async function submitForReview(formData: FormData) {
  const supabase = await createClient();

  const sopId = formData.get("sop_id") as string;
  const sopVersionId = formData.get("sop_version_id") as string;

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Two separate simple queries instead of one embedded join — there are
  // TWO foreign key paths between sop_versions and sops (sop_versions.sop_id
  // → sops.id, and sops.current_version_id → sop_versions.id), which makes
  // PostgREST's automatic relationship embedding ambiguous. Keeping these
  // as plain queries avoids that entirely.
  const { data: version, error: versionError } = await supabase
    .from("sop_versions")
    .select("content, sop_id")
    .eq("id", sopVersionId)
    .single();

  if (versionError || !version) {
    redirect(
      `/sop/${sopId}?error=` +
        encodeURIComponent(versionError?.message ?? "SOP version not found"),
    );
  }

  const validationError = validateContentComplete(version!.content ?? {});
  if (validationError) {
    redirect(`/sop/${sopId}?error=` + encodeURIComponent(validationError));
  }

  const { data: sopRow, error: sopRowError } = await supabase
    .from("sops")
    .select("category_id")
    .eq("id", version!.sop_id)
    .single();

  if (sopRowError || !sopRow) {
    redirect(
      `/sop/${sopId}?error=` +
        encodeURIComponent(sopRowError?.message ?? "SOP not found"),
    );
  }

  // sop_categories holds the default reviewer/approver for this SOP's
  // category — that's what gets assigned onto this specific version.
  const { data: category, error: categoryError } = await supabase
    .from("sop_categories")
    .select("default_reviewer_id, default_approver_id")
    .eq("id", sopRow!.category_id)
    .single();

  if (
    categoryError ||
    !category?.default_reviewer_id ||
    !category?.default_approver_id
  ) {
    redirect(
      `/sop/${sopId}?error=` +
        encodeURIComponent(
          categoryError?.message ??
            "This category has no reviewer/approver assigned yet.",
        ),
    );
  }

  const { error: updateVersionError } = await supabase
    .from("sop_versions")
    .update({
      status: "in_review",
      reviewer_id: category!.default_reviewer_id,
      approver_id: category!.default_approver_id,
    })
    .eq("id", sopVersionId);

  if (updateVersionError) {
    redirect(
      `/sop/${sopId}?error=` + encodeURIComponent(updateVersionError.message),
    );
  }

  const { error: updateSopError } = await supabase
    .from("sops")
    .update({ status: "in_review" })
    .eq("id", sopId);

  if (updateSopError) {
    redirect(
      `/sop/${sopId}?error=` + encodeURIComponent(updateSopError.message),
    );
  }

  const { error: actionError } = await supabase
    .from("approval_actions")
    .insert({
      sop_version_id: sopVersionId,
      actor_id: authUser.id,
      action: "submitted",
    });

  if (actionError) {
    redirect(`/sop/${sopId}?error=` + encodeURIComponent(actionError.message));
  }

  redirect(`/sop/${sopId}`);
}

// ---------------------------------------------------------
// Reviewer decision: approve (moves to approver) or request revision
// (kicks it back to the author as a draft)
// ---------------------------------------------------------
export async function reviewerDecision(formData: FormData) {
  const supabase = await createClient();

  const sopId = formData.get("sop_id") as string;
  const sopVersionId = formData.get("sop_version_id") as string;
  const decision = formData.get("decision") as "approve" | "request_revision";
  const comment = (formData.get("comment") as string) || null;

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const nextVersionStatus = decision === "approve" ? "in_approval" : "draft";
  const nextSopStatus = decision === "approve" ? "in_approval" : "draft";
  const action =
    decision === "approve" ? "review_approved" : "revision_requested";

  const { error: updateVersionError } = await supabase
    .from("sop_versions")
    .update({
      status: nextVersionStatus,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", sopVersionId);

  if (updateVersionError) {
    redirect(
      `/sop/${sopId}?error=` + encodeURIComponent(updateVersionError.message),
    );
  }

  const { error: updateSopError } = await supabase
    .from("sops")
    .update({ status: nextSopStatus })
    .eq("id", sopId);

  if (updateSopError) {
    redirect(
      `/sop/${sopId}?error=` + encodeURIComponent(updateSopError.message),
    );
  }

  const { error: actionError } = await supabase
    .from("approval_actions")
    .insert({
      sop_version_id: sopVersionId,
      actor_id: authUser.id,
      action,
      comment,
    });

  if (actionError) {
    redirect(`/sop/${sopId}?error=` + encodeURIComponent(actionError.message));
  }

  redirect(`/sop/${sopId}`);
}

// ---------------------------------------------------------
// Approver decision: approve (publishes the SOP, sets validity period,
// and — new — supersedes whatever version was previously current, so
// multiple revisions of the same SOP can exist over time) or reject
// (kicks it back to the author as a draft)
// ---------------------------------------------------------
const VALIDITY_YEARS = 2; // per the SOP lifecycle plan (2-3 years); adjust as needed

export async function approverDecision(formData: FormData) {
  const supabase = await createClient();

  const sopId = formData.get("sop_id") as string;
  const sopVersionId = formData.get("sop_version_id") as string;
  const decision = formData.get("decision") as "approve" | "reject";
  const comment = (formData.get("comment") as string) || null;

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  if (decision === "approve") {
    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setFullYear(validUntil.getFullYear() + VALIDITY_YEARS);

    // Grab whatever version was current before this one takes over, so
    // it can be marked "superseded" below.
    const { data: oldVersion } = await supabase
      .from("sops")
      .select("current_version_id")
      .eq("id", sopId)
      .single();

    await supabase
      .from("sops")
      .update({ status: "published", current_version_id: sopVersionId })
      .eq("id", sopId);

    if (
      oldVersion?.current_version_id &&
      oldVersion.current_version_id !== sopVersionId
    ) {
      await supabase
        .from("sop_versions")
        .update({ status: "superseded" })
        .eq("id", oldVersion.current_version_id);
    }

    const { error: updateVersionError } = await supabase
      .from("sop_versions")
      .update({
        status: "published",
        approved_at: now.toISOString(),
        published_at: now.toISOString(),
        valid_until: validUntil.toISOString().slice(0, 10),
      })
      .eq("id", sopVersionId);

    if (updateVersionError) {
      redirect(
        `/sop/${sopId}?error=` + encodeURIComponent(updateVersionError.message),
      );
    }

    const { error: actionError } = await supabase
      .from("approval_actions")
      .insert([
        {
          sop_version_id: sopVersionId,
          actor_id: authUser.id,
          action: "approved",
          comment,
        },
        {
          sop_version_id: sopVersionId,
          actor_id: authUser.id,
          action: "published",
        },
      ]);

    if (actionError) {
      redirect(
        `/sop/${sopId}?error=` + encodeURIComponent(actionError.message),
      );
    }

    // Rebuild the searchable chunks the SOP AI Assistant reads from, so it
    // picks up this version's content immediately. Safe to run every publish
    // — the function clears any previous chunks for this sop_id first.
    const { data: publishedVersion } = await supabase
      .from("sop_versions")
      .select(
        "content, sop:sops!sop_versions_sop_id_fkey(document_number, title)",
      )
      .eq("id", sopVersionId)
      .single();

    if (publishedVersion) {
      const sopMeta = Array.isArray(publishedVersion.sop)
        ? publishedVersion.sop[0]
        : publishedVersion.sop;

      await supabase.rpc("regenerate_sop_content_chunks", {
        p_sop_id: sopId,
        p_sop_version_id: sopVersionId,
        p_document_number: sopMeta?.document_number ?? "",
        p_title: sopMeta?.title ?? "",
        p_content: publishedVersion.content,
      });
    }

    // Generate one socialization_records row per user in this SOP's
    // department, and (for now) log a stub email to each of them.
    // Errors here are logged but don't block the publish itself — the
    // SOP is already published at this point; socialization is a
    // follow-on step, not a precondition for publishing.
    const { data: sopWithDept } = await supabase
      .from("sops")
      .select("title, document_number, category:sop_categories(department_id)")
      .eq("id", sopId)
      .single();

    const category = Array.isArray(sopWithDept?.category)
      ? sopWithDept.category[0]
      : sopWithDept?.category;

    if (category?.department_id) {
      const { data: departmentUsers } = await supabase
        .from("users")
        .select("id, email")
        .eq("department_id", category.department_id);

      if (departmentUsers && departmentUsers.length > 0) {
        const { error: socializationError } = await supabase
          .from("socialization_records")
          .insert(
            departmentUsers.map((u) => ({
              sop_version_id: sopVersionId,
              user_id: u.id,
              notified_at: new Date().toISOString(),
            })),
          );

        if (socializationError) {
          console.error(
            "Failed to create socialization_records:",
            socializationError.message,
          );
        } else {
          for (const u of departmentUsers) {
            await sendSocializationEmail(
              u.email,
              sopWithDept!.title,
              sopWithDept!.document_number,
            );
          }
        }
      }
    }
  } else {
    const { error: updateVersionError } = await supabase
      .from("sop_versions")
      .update({ status: "draft" })
      .eq("id", sopVersionId);

    if (updateVersionError) {
      redirect(
        `/sop/${sopId}?error=` + encodeURIComponent(updateVersionError.message),
      );
    }

    const { error: updateSopError } = await supabase
      .from("sops")
      .update({ status: "draft" })
      .eq("id", sopId);

    if (updateSopError) {
      redirect(
        `/sop/${sopId}?error=` + encodeURIComponent(updateSopError.message),
      );
    }

    const { error: actionError } = await supabase
      .from("approval_actions")
      .insert({
        sop_version_id: sopVersionId,
        actor_id: authUser.id,
        action: "rejected",
        comment,
      });

    if (actionError) {
      redirect(
        `/sop/${sopId}?error=` + encodeURIComponent(actionError.message),
      );
    }
  }

  redirect(`/sop/${sopId}`);
}

// ---------------------------------------------------------
// Soft delete: marks a SOP with `deleted_at` instead of removing rows,
// so it can still be referenced in history/reports and isn't gone
// forever by mistake.
//
// REQUIRES a `deleted_at timestamptz` column on `sops` — see
// sql-008_sop_soft_delete.sql. Also: the SOP list page and this detail
// page's query don't currently filter out soft-deleted rows anywhere —
// that filter (`.is('deleted_at', null)`) needs adding wherever SOPs are
// listed/fetched, or a "deleted" SOP will still show up. Flagging this
// rather than silently leaving it half-wired.
// ---------------------------------------------------------
export async function softDeleteSop(formData: FormData) {
  const supabase = await createClient();
  const sopId = formData.get("sop_id") as string;

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("sops")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", sopId);

  if (error) {
    redirect(`/sop/${sopId}?error=` + encodeURIComponent(error.message));
  }

  redirect("/sop?message=" + encodeURIComponent("SOP deleted"));
}

// ---------------------------------------------------------
// Start a new revision of a published SOP: creates a new draft
// sop_versions row (content copied from the current published version,
// so the author isn't starting from a blank page), and points
// sops.current_version_id / status at it. The previously-published
// version is left untouched here — it only gets marked "superseded"
// once this new revision is itself approved & published (see
// approverDecision above), matching the supersede logic already there.
//
// Note: change_summary isn't persisted anywhere yet. approval_actions'
// `action` check constraint doesn't have a "revision_started" value, so
// logging this to that table the way submitForReview/reviewerDecision
// do would fail — either add a new allowed action value via migration,
// or store change_summary in a dedicated column/table if you want a
// permanent record of it.
// ---------------------------------------------------------
export async function createRevision(formData: FormData) {
  const supabase = await createClient();
  const sopId = formData.get("sop_id") as string;
  const changeSummary = (formData.get("change_summary") as string)?.trim();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  if (!changeSummary) {
    redirect(
      `/sop/${sopId}?error=` +
        encodeURIComponent("Please describe the change for this revision."),
    );
  }

  const { data: currentSop, error: sopError } = await supabase
    .from("sops")
    .select("current_version_id")
    .eq("id", sopId)
    .single();

  if (sopError || !currentSop?.current_version_id) {
    redirect(
      `/sop/${sopId}?error=` +
        encodeURIComponent(sopError?.message ?? "Current version not found"),
    );
  }

  const { data: currentVersion, error: versionError } = await supabase
    .from("sop_versions")
    .select("content, version_number")
    .eq("id", currentSop!.current_version_id)
    .single();

  if (versionError || !currentVersion) {
    redirect(
      `/sop/${sopId}?error=` +
        encodeURIComponent(
          versionError?.message ?? "Current version content not found",
        ),
    );
  }

  const { data: newVersion, error: insertError } = await supabase
    .from("sop_versions")
    .insert({
      sop_id: sopId,
      version_number: currentVersion!.version_number + 1,
      content: currentVersion!.content,
      status: "draft",
      author_id: authUser.id,
      previous_version_id: currentSop!.current_version_id,
    })
    .select("id")
    .single();

  if (insertError || !newVersion) {
    redirect(
      `/sop/${sopId}?error=` +
        encodeURIComponent(insertError?.message ?? "Failed to create revision"),
    );
  }

  const { error: updateSopError } = await supabase
    .from("sops")
    .update({ current_version_id: newVersion!.id, status: "draft" })
    .eq("id", sopId);

  if (updateSopError) {
    redirect(
      `/sop/${sopId}?error=` + encodeURIComponent(updateSopError.message),
    );
  }

  redirect(`/sop/${sopId}`);
}
