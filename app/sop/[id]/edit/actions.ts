"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateSopContent(formData: FormData) {
  const supabase = await createClient();

  const sopId = formData.get("sop_id") as string;
  const sopVersionId = formData.get("sop_version_id") as string;
  const title = formData.get("title") as string;
  const purpose = formData.get("purpose") as string;
  const appliesTo = formData.get("scope_applies_to") as string;
  const excludes = formData.get("scope_excludes") as string;

  // These three come from DynamicListEditor as a JSON string (array of
  // {key: value} row objects) — parsed here rather than trying to encode
  // an array of objects as flat form fields. Falls back to [] if the
  // JSON is somehow malformed, rather than crashing the whole save.
  function safeParseArray(raw: FormDataEntryValue | null) {
    try {
      const parsed = JSON.parse((raw as string) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  const references = safeParseArray(formData.get("references_json"));
  const definitions = safeParseArray(formData.get("definitions_json"));
  const rolesResponsibilities = safeParseArray(
    formData.get("roles_responsibilities_json"),
  );
  const procedure = safeParseArray(formData.get("procedure_json"));
  const appendices = safeParseArray(formData.get("appendices_json"));

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
    references,
    definitions,
    roles_responsibilities: rolesResponsibilities,
    procedure,
    appendices,
  };

  if (!title?.trim()) {
    redirect(
      `/sop/${sopId}/edit?error=` + encodeURIComponent("Title cannot be empty"),
    );
  }

  // Title lives on `sops`, not `sop_versions` — updated as a separate
  // statement. RLS policy "sops_update_stakeholders_or_admin" already
  // allows this for the author/reviewer/approver of the current version.
  const { error: titleError } = await supabase
    .from("sops")
    .update({ title })
    .eq("id", sopId);

  if (titleError) {
    redirect(
      `/sop/${sopId}/edit?error=` + encodeURIComponent(titleError.message),
    );
  }

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
