"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
