// Taruh di: app/sop/[id]/block-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

type ActionResult = { error?: string };

// ---------------------------------------------------------
// Guard dipakai di semua block save: hanya author/admin/document_controller
// yang boleh edit, dan hanya selama versi masih 'draft'. RLS di database
// tetap jadi pertahanan utama (lihat sops_update_stakeholders_or_admin /
// versions_update_stakeholders) — ini cuma lapisan UX supaya errornya
// jelas ("Only draft versions can be edited") bukan error SQL mentah.
// ---------------------------------------------------------
async function assertCanEditVersion(
  sopVersionId: string,
): Promise<
  { ok: true; content: Record<string, any> } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const currentUser = await getCurrentUser();

  if (!currentUser) return { ok: false, error: "Not logged in." };

  const { data: version, error } = await supabase
    .from("sop_versions")
    .select("content, status, author_id")
    .eq("id", sopVersionId)
    .single();

  if (error || !version) {
    return { ok: false, error: error?.message ?? "SOP version not found." };
  }

  const isAuthor = version.author_id === currentUser.id;
  const isAdminOrDc =
    currentUser.role === "admin" || currentUser.role === "document_controller";

  if (version.status !== "draft") {
    return { ok: false, error: "Only draft versions can be edited." };
  }
  if (!isAuthor && !isAdminOrDc) {
    return { ok: false, error: "You are not allowed to edit this SOP." };
  }

  return { ok: true, content: (version.content as Record<string, any>) ?? {} };
}

function safeParseArray(raw: FormDataEntryValue | null) {
  try {
    const parsed = JSON.parse((raw as string) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveContentPatch(
  sopId: string,
  sopVersionId: string,
  patch: Record<string, any>,
): Promise<ActionResult> {
  const check = await assertCanEditVersion(sopVersionId);
  if (!check.ok) return { error: check.error };

  const supabase = await createClient();
  const mergedContent = { ...check.content, ...patch };

  const { error } = await supabase
    .from("sop_versions")
    .update({ content: mergedContent })
    .eq("id", sopVersionId);

  if (error) return { error: error.message };

  revalidatePath(`/sop/${sopId}`);
  return {};
}

// ---------------------------------------------------------
// Title — kolom di tabel `sops`, bukan bagian dari jsonb content
// ---------------------------------------------------------
export async function updateTitleBlock(
  sopId: string,
  sopVersionId: string,
  formData: FormData,
): Promise<ActionResult> {
  const check = await assertCanEditVersion(sopVersionId);
  if (!check.ok) return { error: check.error };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title cannot be empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sops")
    .update({ title })
    .eq("id", sopId);
  if (error) return { error: error.message };

  revalidatePath(`/sop/${sopId}`);
  return {};
}

export async function updatePurposeBlock(
  sopId: string,
  sopVersionId: string,
  formData: FormData,
): Promise<ActionResult> {
  const purpose = (formData.get("purpose") as string) ?? "";
  if (!purpose.trim()) return { error: "Purpose cannot be empty." };
  return saveContentPatch(sopId, sopVersionId, { purpose });
}

export async function updateScopeBlock(
  sopId: string,
  sopVersionId: string,
  formData: FormData,
): Promise<ActionResult> {
  const appliesTo = (formData.get("scope_applies_to") as string) ?? "";
  const excludes = (formData.get("scope_excludes") as string) ?? "";
  if (!appliesTo.trim())
    return { error: "Scope (applies to) cannot be empty." };
  return saveContentPatch(sopId, sopVersionId, {
    scope: { applies_to: appliesTo, excludes },
  });
}

export async function updateReferencesBlock(
  sopId: string,
  sopVersionId: string,
  formData: FormData,
): Promise<ActionResult> {
  return saveContentPatch(sopId, sopVersionId, {
    references: safeParseArray(formData.get("references_json")),
  });
}

export async function updateDefinitionsBlock(
  sopId: string,
  sopVersionId: string,
  formData: FormData,
): Promise<ActionResult> {
  return saveContentPatch(sopId, sopVersionId, {
    definitions: safeParseArray(formData.get("definitions_json")),
  });
}

export async function updateRolesBlock(
  sopId: string,
  sopVersionId: string,
  formData: FormData,
): Promise<ActionResult> {
  return saveContentPatch(sopId, sopVersionId, {
    roles_responsibilities: safeParseArray(
      formData.get("roles_responsibilities_json"),
    ),
  });
}

export async function updateProcedureBlock(
  sopId: string,
  sopVersionId: string,
  formData: FormData,
): Promise<ActionResult> {
  return saveContentPatch(sopId, sopVersionId, {
    procedure: safeParseArray(formData.get("procedure_json")),
  });
}

export async function updateAppendicesBlock(
  sopId: string,
  sopVersionId: string,
  formData: FormData,
): Promise<ActionResult> {
  return saveContentPatch(sopId, sopVersionId, {
    appendices: safeParseArray(formData.get("appendices_json")),
  });
}
