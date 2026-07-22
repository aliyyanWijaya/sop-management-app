"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateSopContent(formData: FormData) {
  const supabase = await createClient();

  const sopId = formData.get("sop_id") as string;
  const sopVersionId = formData.get("sop_version_id") as string;
  const purpose = formData.get("purpose") as string;
  const appliesTo = formData.get("scope_applies_to") as string;
  const excludes = formData.get("scope_excludes") as string;

  // Fetch the existing content first — so other sections (references,
  // procedure, etc., which don't have UI yet at this step) aren't wiped
  // out. This is a "fetch, merge, write" pattern since we're updating
  // part of a jsonb column, not the whole thing.
  const { data: existing, error: fetchError } = await supabase
    .from("sop_versions")
    .select("content")
    .eq("id", sopVersionId)
    .single();

  if (fetchError || !existing) {
    redirect(
      `/sop/${sopId}/edit?error=` +
        encodeURIComponent(fetchError?.message ?? "SOP version not found"),
    );
  }

  const mergedContent = {
    ...existing!.content,
    purpose,
    scope: { applies_to: appliesTo, excludes },
  };

  const { error: updateError } = await supabase
    .from("sop_versions")
    .update({ content: mergedContent })
    .eq("id", sopVersionId);

  if (updateError) {
    redirect(
      `/sop/${sopId}/edit?error=` + encodeURIComponent(updateError.message),
    );
  }

  redirect(`/sop/${sopId}`);
}
