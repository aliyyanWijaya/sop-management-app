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
// Approver decision: approve (publishes the SOP, sets validity period)
// or reject (kicks it back to the author as a draft)
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

    // tambahkan di dalam blok decision === 'approve', setelah update sop_versions & sops:
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

    const { error: updateSopError } = await supabase
      .from("sops")
      .update({ status: "published" })
      .eq("id", sopId);

    if (updateSopError) {
      redirect(
        `/sop/${sopId}?error=` + encodeURIComponent(updateSopError.message),
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

    // Redirect ke halaman assign setelah publish
    redirect(`/sop/${sopId}/assign`);
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

export async function softDeleteSop(formData: FormData) {
  const supabase = await createClient();
  const sopId = formData.get("sop_id") as string;

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { error } = await supabase
    .from("sops")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", sopId);

  if (error) {
    redirect(`/sop/${sopId}?error=` + encodeURIComponent(error.message));
  }

  redirect("/sop");
}

// app/sop/[id]/actions.ts
export async function createRevision(formData: FormData) {
  const supabase = await createClient();
  const sopId = formData.get("sop_id") as string;
  const changeSummary = (formData.get("change_summary") as string)?.trim();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  if (!changeSummary) {
    redirect(
      `/sop/${sopId}?error=` +
        encodeURIComponent(
          "Please explain the changes being made in this revision.",
        ),
    );
  }

  const { data: sop } = await supabase
    .from("sops")
    .select("current_version_id")
    .eq("id", sopId)
    .single();

  if (!sop?.current_version_id) {
    redirect(
      `/sop/${sopId}?error=` +
        encodeURIComponent(
          "No active version found for this SOP. Cannot create a revision.",
        ),
    );
  }

  // Kalau sudah ada draft revisi yang lagi jalan, jangan bikin baru lagi
  const { data: existingDraft } = await supabase
    .from("sop_versions")
    .select("id")
    .eq("sop_id", sopId)
    .eq("status", "draft")
    .neq("id", sop!.current_version_id)
    .maybeSingle();

  if (existingDraft) {
    redirect(`/sop/${sopId}/edit?version=${existingDraft.id}`);
  }

  const { data: currentVersion } = await supabase
    .from("sop_versions")
    .select("content, version_number")
    .eq("id", sop!.current_version_id)
    .single();

  const { data: newVersion, error } = await supabase
    .from("sop_versions")
    .insert({
      sop_id: sopId,
      version_number: currentVersion!.version_number + 1,
      content: currentVersion!.content,
      status: "draft",
      author_id: authUser.id,
      previous_version_id: sop!.current_version_id,
      change_summary: changeSummary, // <-- disimpan di sini
    })
    .select("id")
    .single();

  if (error || !newVersion) {
    redirect(
      `/sop/${sopId}?error=` +
        encodeURIComponent(error?.message ?? "Failed to create revision"),
    );
  }

  redirect(`/sop/${sopId}/edit?version=${newVersion!.id}`);
}
