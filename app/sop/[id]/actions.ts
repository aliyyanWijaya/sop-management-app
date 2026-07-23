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

  const { data: version, error: versionError } = await supabase
    .from("sop_versions")
    .select("content, sop_id, sops!inner(category_id)")
    .eq("id", sopVersionId)
    .single();

  if (versionError || !version) {
    redirect(
      `/sop/${sopId}?error=` + encodeURIComponent("SOP version not found"),
    );
  }

  const validationError = validateContentComplete(version!.content ?? {});
  if (validationError) {
    redirect(`/sop/${sopId}?error=` + encodeURIComponent(validationError));
  }

  // sop_categories holds the default reviewer/approver for this SOP's
  // category — that's what gets assigned onto this specific version.
  const categoryId = (version!.sops as unknown as { category_id: string })
    .category_id;
  const { data: category, error: categoryError } = await supabase
    .from("sop_categories")
    .select("default_reviewer_id, default_approver_id")
    .eq("id", categoryId)
    .single();

  if (
    categoryError ||
    !category?.default_reviewer_id ||
    !category?.default_approver_id
  ) {
    redirect(
      `/sop/${sopId}?error=` +
        encodeURIComponent(
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
