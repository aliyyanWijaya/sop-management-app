"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProcedureStep = {
  major_step: string;
  actions: string[];
};

// A small reusable sub-list for plain strings (used for both "actions"
// and "notes" inside each major step) — simpler than DynamicListEditor
// since each entry here is just one string, not a row of fields.
function StringSubList({
  items,
  onChange,
  placeholder,
  addLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((value, i) => (
        <div key={i} className="flex gap-2">
          <Input
            type="text"
            value={value}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder={placeholder}
            className="h-8"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="shrink-0 cursor-pointer transition-transform active:scale-95"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="cursor-pointer transition-transform active:scale-95"
        onClick={() => onChange([...items, ""])}
      >
        + {addLabel}
      </Button>
    </div>
  );
}

export function ProcedureEditor({
  name,
  initialSteps = [],
}: {
  /** name of the hidden input that carries the JSON payload on submit */
  name: string;
  initialSteps?: ProcedureStep[];
}) {
  const [steps, setSteps] = useState<ProcedureStep[]>(initialSteps);

  function addStep() {
    setSteps([...steps, { major_step: "", actions: [], notes: [] }]);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(index: number, patch: Partial<ProcedureStep>) {
    setSteps(
      steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-sm font-medium">6.0 Procedure</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer transition-transform active:scale-95"
          onClick={addStep}
        >
          + Add major step
        </Button>
      </div>

      {steps.length === 0 && (
        <p className="text-xs italic text-muted-foreground">No steps yet.</p>
      )}

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={index}
            className="rounded-md border bg-muted/40 p-3 space-y-3"
          >
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                Step {index + 1}
              </span>
              <Input
                type="text"
                value={step.major_step}
                onChange={(e) =>
                  updateStep(index, { major_step: e.target.value })
                }
                placeholder="e.g. Equipment preparation"
                className="h-8 font-medium"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="shrink-0 cursor-pointer transition-transform active:scale-95"
                onClick={() => removeStep(index)}
              >
                Remove step
              </Button>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Action Steps
              </p>
              <StringSubList
                items={step.actions}
                onChange={(actions) => updateStep(index, { actions })}
                placeholder="e.g. Check equipment calibration"
                addLabel="Add action"
              />
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Notes{" "}
                <span className="text-muted-foreground/70">(optional)</span>
              </p>
              <StringSubList
                items={step.notes}
                onChange={(notes) => updateStep(index, { notes })}
                placeholder="e.g. Make sure equipment was calibrated within the last 30 days"
                addLabel="Add note"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Serialized payload the server action reads via formData.get(name) */}
      <input type="hidden" name={name} value={JSON.stringify(steps)} />
    </div>
  );
}
