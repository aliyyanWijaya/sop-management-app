import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";

export default async function MyTrainingsPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { data: records } = await supabase
    .from("socialization_records")
    .select(
      `
      id, passed, completed_at, attempt_count, notified_at, due_at,
      sop_version:sop_versions (
        id,
        sop:sops!sop_versions_sop_id_fkey ( id, title, document_number )
      )
    `,
    )
    .eq("user_id", authUser?.id ?? "")
    .order("notified_at", { ascending: false });

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">My Trainings</h1>
      <p className="text-sm text-muted-foreground">
        SOPs that were published for your department. Read them and complete the
        short quiz to acknowledge you understood them.
      </p>

      {(!records || records.length === 0) && (
        <p className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nothing to review yet.
        </p>
      )}

      <div className="space-y-2">
        {records?.map((r) => {
          const version = Array.isArray(r.sop_version)
            ? r.sop_version[0]
            : r.sop_version;
          const sop = Array.isArray(version?.sop)
            ? version.sop[0]
            : version?.sop;

          // Hitung logika overdue di dalam loop untuk setiap record
          const isOverdue =
            !r.passed && r.due_at && new Date(r.due_at) < new Date();
          const formattedDueDate = r.due_at
            ? new Date(r.due_at).toLocaleDateString()
            : null;

          return (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {sop?.title}
                </CardTitle>
                <p className="font-mono text-xs text-muted-foreground">
                  {sop?.document_number}
                </p>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {r.passed
                      ? `Completed ${r.completed_at ? new Date(r.completed_at).toLocaleDateString() : ""}`
                      : r.attempt_count > 0
                        ? `Attempted ${r.attempt_count}x — not passed yet`
                        : "Not started"}
                  </p>

                  {/* Tampilkan status Deadline / Overdue jika training belum lulus */}
                  {!r.passed && formattedDueDate && (
                    <div>
                      {isOverdue ? (
                        <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
                          Overdue — batas waktu {formattedDueDate}
                        </span>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Batas waktu: {formattedDueDate}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {!r.passed && sop?.id && (
                  <Link
                    href={`/sop/${sop.id}/quiz`}
                    className={buttonVariants({
                      size: "sm",
                      className:
                        "cursor-pointer transition-transform active:scale-95",
                    })}
                  >
                    Take Quiz
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
