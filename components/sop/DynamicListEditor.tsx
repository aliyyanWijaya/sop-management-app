"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FieldConfig = {
  key: string;
  label: string;
  placeholder?: string;
};

type Props = {
  /** name of the hidden input that carries the JSON payload on submit */
  name: string;
  /** section title shown above the list, e.g. "3.0 References" */
  title: string;
  /** the fields each row has, e.g. [{key:'title'}, {key:'doc_number'}] */
  fields: FieldConfig[];
  initialItems?: Record<string, string>[];
  addLabel?: string;
};

// One reusable editor for all "list of N fields" sections (references,
// definitions, roles_responsibilities, appendices) — avoids writing
// near-identical add/remove-row logic for each one.
export function DynamicListEditor({
  name,
  title,
  fields,
  initialItems = [],
  addLabel = "Add row",
}: Props) {
  const [items, setItems] = useState<Record<string, string>[]>(
    initialItems.length > 0 ? initialItems : [],
  );

  function addRow() {
    const emptyRow = Object.fromEntries(fields.map((f) => [f.key, ""]));
    setItems([...items, emptyRow]);
  }

  function removeRow(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateRow(index: number, key: string, value: string) {
    setItems(
      items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-sm font-medium">{title}</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer transition-transform active:scale-95"
          onClick={addRow}
        >
          + {addLabel}
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-xs italic text-muted-foreground">No entries yet.</p>
      )}

      {items.length > 0 && (
        <div className="mb-1 flex gap-2">
          {fields.map((field) => (
            <p
              key={field.key}
              className="w-full text-xs font-medium text-muted-foreground"
            >
              {field.label}
            </p>
          ))}
          <span className="w-[70px] shrink-0" />{" "}
          {/* spacer to align with Remove button */}
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            {fields.map((field) => (
              <Input
                key={field.key}
                type="text"
                value={item[field.key] ?? ""}
                onChange={(e) => updateRow(index, field.key, e.target.value)}
                placeholder={field.placeholder ?? field.label}
              />
            ))}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="shrink-0 cursor-pointer transition-transform active:scale-95"
              onClick={() => removeRow(index)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      {/* Serialized payload the server action reads via formData.get(name) */}
      <input type="hidden" name={name} value={JSON.stringify(items)} />
    </div>
  );
}
