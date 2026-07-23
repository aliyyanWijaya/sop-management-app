"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const PASSING_SCORE = 70; // percent

export async function submitQuiz(formData: FormData) {
  const supabase = await createClient();

  const sopId = formData.get("sop_id") as string;
  const sopVersionId = formData.get("sop_version_id") as string;
  const socializationRecordId = formData.get(
    "socialization_record_id",
  ) as string;
  const questionIds = (formData.get("question_ids") as string).split(",");

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: questions, error: questionsError } = await supabase
    .from("quiz_questions")
    .select("id, correct_option")
    .eq("sop_version_id", sopVersionId);

  if (questionsError || !questions || questions.length === 0) {
    redirect(
      `/sop/${sopId}/quiz?error=` +
        encodeURIComponent("No quiz questions found"),
    );
  }

  let correctCount = 0;
  for (const questionId of questionIds) {
    const selected = formData.get(`answer_${questionId}`);
    const question = questions!.find((q) => q.id === questionId);
    if (
      question &&
      selected !== null &&
      Number(selected) === question.correct_option
    ) {
      correctCount++;
    }
  }

  const score = Math.round((correctCount / questions!.length) * 100);
  const passed = score >= PASSING_SCORE;

  const { error: attemptError } = await supabase.from("quiz_attempts").insert({
    socialization_record_id: socializationRecordId,
    score,
    passed,
  });

  if (attemptError) {
    redirect(
      `/sop/${sopId}/quiz?error=` + encodeURIComponent(attemptError.message),
    );
  }

  // RLS lets a user update their own socialization_records row (see
  // "socialization_update_own"). attempt_count is incremented via a
  // read-then-write since Postgres RLS updates can't reference the
  // pre-update row value directly from the client.
  const { data: existingRecord } = await supabase
    .from("socialization_records")
    .select("attempt_count")
    .eq("id", socializationRecordId)
    .single();

  const { error: updateError } = await supabase
    .from("socialization_records")
    .update({
      attempt_count: (existingRecord?.attempt_count ?? 0) + 1,
      passed,
      completed_at: passed ? new Date().toISOString() : null,
    })
    .eq("id", socializationRecordId);

  if (updateError) {
    redirect(
      `/sop/${sopId}/quiz?error=` + encodeURIComponent(updateError.message),
    );
  }

  redirect(`/sop/${sopId}/quiz?result=${score}&passed=${passed}`);
}
