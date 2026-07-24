"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SOCIALIZATION_DEADLINE_DAYS = 7;

// Stub — sama seperti di app/sop/[id]/actions.ts, ganti dengan provider asli nanti.
async function sendSocializationEmail(
  to: string,
  sopTitle: string,
  sopDocumentNumber: string,
  dueAt: Date,
) {
  console.log(
    `[stub email] To: ${to} — Subject: Sosialisasi & Kuis SOP ${sopDocumentNumber} ${sopTitle} — ` +
      `Batas waktu: ${dueAt.toLocaleDateString()}`,
  );
}

export async function assignSocialization(formData: FormData) {
  const supabase = await createClient();

  const sopId = formData.get("sop_id") as string;
  const sopVersionId = formData.get("sop_version_id") as string;
  const selectedUserIds = JSON.parse(
    (formData.get("selected_user_ids") as string) || "[]",
  ) as string[];

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  if (selectedUserIds.length === 0) {
    redirect(
      `/sop/${sopId}/assign?error=` +
        encodeURIComponent("Pilih minimal satu penerima"),
    );
  }

  const now = new Date();
  const dueAt = new Date(now);
  dueAt.setDate(dueAt.getDate() + SOCIALIZATION_DEADLINE_DAYS);

  const { data: sop } = await supabase
    .from("sops")
    .select("title, document_number")
    .eq("id", sopId)
    .single();

  // ignoreDuplicates supaya kalau ada yang kepilih ulang (misal race
  // condition dua tab), tidak error karena unique(sop_version_id, user_id).
  const { error } = await supabase.from("socialization_records").upsert(
    selectedUserIds.map((userId) => ({
      sop_version_id: sopVersionId,
      user_id: userId,
      notified_at: now.toISOString(),
      due_at: dueAt.toISOString(),
    })),
    { onConflict: "sop_version_id,user_id", ignoreDuplicates: true },
  );

  if (error) {
    redirect(`/sop/${sopId}/assign?error=` + encodeURIComponent(error.message));
  }

  const { data: recipients } = await supabase
    .from("users")
    .select("email")
    .in("id", selectedUserIds);

  for (const r of recipients ?? []) {
    await sendSocializationEmail(
      r.email,
      sop?.title ?? "",
      sop?.document_number ?? "",
      dueAt,
    );
  }

  redirect(
    `/sop/${sopId}?message=` +
      encodeURIComponent(
        `Sosialisasi di-assign ke ${selectedUserIds.length} orang, deadline ${dueAt.toLocaleDateString()}`,
      ),
  );
}
