"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type QuizQuestion = {
  question_text: string;
  options: string[];
  correct_option: number;
};

function newQuestion(): QuizQuestion {
  return { question_text: "", options: ["", "", ""], correct_option: 0 };
}

export function QuizEditor({
  name,
  initialQuestions = [],
}: {
  /** name of the hidden input that carries the JSON payload on submit */
  name: string;
  initialQuestions?: QuizQuestion[];
}) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialQuestions.length > 0 ? initialQuestions : [],
  );

  function addQuestion() {
    setQuestions([...questions, newQuestion()]);
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function updateQuestion(index: number, patch: Partial<QuizQuestion>) {
    setQuestions(
      questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    const question = questions[qIndex];
    const nextOptions = [...question.options];
    nextOptions[oIndex] = value;
    updateQuestion(qIndex, { options: nextOptions });
  }

  function addOption(qIndex: number) {
    const question = questions[qIndex];
    updateQuestion(qIndex, { options: [...question.options, ""] });
  }

  function removeOption(qIndex: number, oIndex: number) {
    const question = questions[qIndex];
    const nextOptions = question.options.filter((_, i) => i !== oIndex);
    // shift correct_option down if we removed an earlier option, or reset
    // to 0 if the correct one itself got removed
    const nextCorrect =
      question.correct_option === oIndex
        ? 0
        : question.correct_option > oIndex
          ? question.correct_option - 1
          : question.correct_option;
    updateQuestion(qIndex, {
      options: nextOptions,
      correct_option: nextCorrect,
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-sm font-medium">Socialization Quiz</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer transition-transform active:scale-95"
          onClick={addQuestion}
        >
          + Add question
        </Button>
      </div>

      <p className="mb-2 text-xs text-muted-foreground">
        Employees answer these after reading the published SOP. Aim for ~3 short
        questions checking they understood the key points.
      </p>

      {questions.length === 0 && (
        <p className="text-xs italic text-muted-foreground">
          No questions yet.
        </p>
      )}

      <div className="space-y-4">
        {questions.map((q, qIndex) => (
          <div
            key={qIndex}
            className="rounded-md border bg-muted/40 p-3 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                Q{qIndex + 1}
              </span>
              <Input
                type="text"
                value={q.question_text}
                onChange={(e) =>
                  updateQuestion(qIndex, { question_text: e.target.value })
                }
                placeholder="e.g. Who must sign off before raw materials enter the warehouse?"
                className="h-8"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="shrink-0 cursor-pointer transition-transform active:scale-95"
                onClick={() => removeQuestion(qIndex)}
              >
                Remove
              </Button>
            </div>

            <div className="space-y-1.5 pl-1">
              {q.options.map((opt, oIndex) => (
                <div key={oIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qIndex}`}
                    checked={q.correct_option === oIndex}
                    onChange={() =>
                      updateQuestion(qIndex, { correct_option: oIndex })
                    }
                    className="h-4 w-4 cursor-pointer"
                    title="Mark as correct answer"
                  />
                  <Input
                    type="text"
                    value={opt}
                    onChange={(e) =>
                      updateOption(qIndex, oIndex, e.target.value)
                    }
                    placeholder={`Option ${oIndex + 1}`}
                    className="h-8"
                  />
                  {q.options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer text-xs"
                      onClick={() => removeOption(qIndex, oIndex)}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer text-xs transition-transform active:scale-95"
                onClick={() => addOption(qIndex)}
              >
                + Add option
              </Button>
              <p className="text-xs text-muted-foreground">
                Select the radio button next to the correct answer.
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Serialized payload the server action reads via formData.get(name) */}
      <input type="hidden" name={name} value={JSON.stringify(questions)} />
    </div>
  );
}
