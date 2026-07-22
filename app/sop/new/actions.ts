"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Simplest possible `content` shape for now — other sections are filled
// in on the edit page after the draft exists.
const EMPTY_CONTENT = {
  purpose: "",
  scope: { applies_to: "", excludes: "" },
  references: [],
  definitions: [],
  roles_responsibilities: [],
  procedure: [],
  appendices: [],
};

export async function createSopDraft(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const title = formData.get("title") as string;
  const categoryId = formData.get("category_id") as string;

  if (!title || !categoryId) {
    redirect(
      "/sop/new?error=" + encodeURIComponent("Title and category are required"),
    );
  }

  // Reserve the next sequential document number for this category's
  // department (e.g. SOP-QA-0001) — this is atomic on the database side,
  // so two people submitting at the same moment never get the same number.
  const { data: documentNumber, error: numberError } = await supabase.rpc(
    "generate_sop_document_number",
    { p_category_id: categoryId },
  );

  if (numberError || !documentNumber) {
    redirect(
      "/sop/new?error=" +
        encodeURIComponent(
          numberError?.message ?? "Failed to generate document number",
        ),
    );
  }

  // 1. Create the `sops` row (the SOP "umbrella")
  const { data: sop, error: sopError } = await supabase
    .from("sops")
    .insert({
      category_id: categoryId,
      title,
      document_number: documentNumber,
      status: "draft",
    })
    .select("id")
    .single();

  if (sopError || !sop) {
    redirect(
      "/sop/new?error=" +
        encodeURIComponent(sopError?.message ?? "Failed to create SOP"),
    );
  }

  // 2. Create the first version (`sop_versions`), author = the logged-in user
  const { data: version, error: versionError } = await supabase
    .from("sop_versions")
    .insert({
      sop_id: sop!.id,
      version_number: 1,
      content: EMPTY_CONTENT,
      status: "draft",
      author_id: authUser.id,
    })
    .select("id")
    .single();

  if (versionError || !version) {
    redirect(
      "/sop/new?error=" +
        encodeURIComponent(
          versionError?.message ?? "Failed to create SOP version",
        ),
    );
  }

  // 3. Link `sops.current_version_id` to the version we just created
  const { error: updateError } = await supabase
    .from("sops")
    .update({ current_version_id: version!.id })
    .eq("id", sop!.id);

  if (updateError) {
    redirect("/sop/new?error=" + encodeURIComponent(updateError.message));
  }

  redirect(`/sop/${sop!.id}`);
}
