import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { submitQuiz } from "./actions";

export default async function SopQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; result?: string; passed?: string }>;
}) {
  const { id } = await params;
  const { error, result, passed } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { data: sop } = await supabase
    .from("sops")
    .select(
      `
      id, title, document_number,
      current_version:sop_versions!fk_sops_current_version ( id, status )
    `,
    )
    .eq("id", id)
    .single();

  if (!sop) notFound();

  const version = Array.isArray(sop.current_version)
    ? sop.current_version[0]
    : sop.current_version;

  if (!version || version.status !== "published") {
    notFound();
  }

  const { data: record } = await supabase
    .from("socialization_records")
    .select("id, passed, attempt_count")
    .eq("sop_version_id", version.id)
    .eq("user_id", authUser?.id ?? "")
    .maybeSingle();

  if (!record) {
    return (
      <div className="max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Not assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You don&apos;t have a socialization record for this SOP — it may
              not apply to your department, or hasn&apos;t been assigned to you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, question_text, options")
    .eq("sop_version_id", version.id);

  return (
    <div className="max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>{sop.title}</CardTitle>
          <p className="font-mono text-xs text-muted-foreground">
            {sop.document_number}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="rounded bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {result && (
            <p
              className={`rounded p-3 text-sm ${
                passed === "true"
                  ? "bg-green-50 text-green-700"
                  : "bg-yellow-50 text-yellow-800"
              }`}
            >
              Score: {result}% —{" "}
              {passed === "true"
                ? "Passed! Thanks for completing this."
                : "Not quite — try again."}
            </p>
          )}

          {record.passed ? (
            <p className="rounded bg-green-50 p-3 text-sm text-green-700">
              You&apos;ve already completed this quiz.
            </p>
          ) : !questions || questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No quiz questions have been added for this SOP yet.
            </p>
          ) : (
            <form action={submitQuiz} className="flex flex-col gap-4">
              <input type="hidden" name="sop_id" value={sop.id} />
              <input type="hidden" name="sop_version_id" value={version.id} />
              <input
                type="hidden"
                name="socialization_record_id"
                value={record.id}
              />
              <input
                type="hidden"
                name="question_ids"
                value={questions.map((q) => q.id).join(",")}
              />

              {questions.map((q, i) => (
                <div key={q.id} className="space-y-1.5">
                  <p className="text-sm font-medium">
                    {i + 1}. {q.question_text}
                  </p>
                  {(q.options as string[]).map((opt, oIndex) => (
                    <label
                      key={oIndex}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name={`answer_${q.id}`}
                        value={oIndex}
                        required
                        className="h-4 w-4 cursor-pointer"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ))}

              <Button
                type="submit"
                className="w-fit cursor-pointer transition-transform active:scale-95"
              >
                Submit Answers
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
