import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { assignSocialization } from "./actions";
import RecipientPicker from "@/components/sop/RecipientPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AssignSocializationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const currentUser = await getCurrentUser();

  const { data: sop } = await supabase
    .from("sops")
    .select(
      `id, title, document_number,
       current_version:sop_versions!fk_sops_current_version ( id, status, author_id )`,
    )
    .eq("id", id)
    .single();

  if (!sop) notFound();

  const version = Array.isArray(sop.current_version)
    ? sop.current_version[0]
    : sop.current_version;
  if (!version || version.status !== "published") notFound();

  const isAuthor = currentUser?.id === version.author_id;
  const isAdmin =
    currentUser?.role === "admin" ||
    currentUser?.role === "document_controller";
  if (!isAuthor && !isAdmin) notFound();

  const { data: users } = await supabase
    .from("users")
    .select("id, name, email, department_id")
    .order("name");

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name");

  const { data: existing } = await supabase
    .from("socialization_records")
    .select("user_id")
    .eq("sop_version_id", version.id);

  const alreadyAssignedIds = (existing ?? []).map((e) => e.user_id);

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Assign Socialization &amp; Quiz</CardTitle>
          <p className="font-mono text-xs text-muted-foreground">
            {sop.document_number} — {sop.title}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="rounded bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <p className="text-sm text-muted-foreground">
            Pilih penerima. Mereka akan mendapat notifikasi dan punya waktu 7
            hari untuk membaca SOP ini dan menyelesaikan kuiznya.
          </p>

          <form action={assignSocialization} className="space-y-4">
            <input type="hidden" name="sop_id" value={sop.id} />
            <input type="hidden" name="sop_version_id" value={version.id} />

            <RecipientPicker
              name="selected_user_ids"
              users={users ?? []}
              departments={departments ?? []}
              alreadyAssignedIds={alreadyAssignedIds}
            />

            <Button
              type="submit"
              className="cursor-pointer transition-transform active:scale-95"
            >
              Assign &amp; Notify
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
