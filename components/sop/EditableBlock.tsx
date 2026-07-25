// Taruh di: components/sop/EditableBlock.tsx
"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

type SaveResult = { error?: string } | void;

type EditableBlockProps = {
  /** Tampilan read-only (dipakai saat tidak sedang diedit) */
  children: ReactNode;
  /** Render form edit khusus untuk block ini */
  renderEditor: () => ReactNode;
  /** Server action (boleh sudah di-.bind() dengan id) yang dipanggil saat Save */
  onSave: (formData: FormData) => Promise<SaveResult>;
  /** Kalau false, block tampil read-only saja (tidak bisa diklik) */
  editable: boolean;
  /** Nama section, dipakai di tooltip/label "Edit ..." */
  label: string;
};

export function EditableBlock({
  children,
  renderEditor,
  onSave,
  editable,
  label,
}: EditableBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editable) {
    return <div>{children}</div>;
  }

  if (!isEditing) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsEditing(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsEditing(true);
          }
        }}
        className="group -m-2 cursor-pointer rounded-md p-2 outline-none transition-colors hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 focus-visible:ring-2 focus-visible:ring-blue-400"
        title={`Click to edit ${label}`}
      >
        {children}
        <span className="mt-1 hidden items-center gap-1 text-xs font-medium text-blue-600 group-hover:flex">
          <Pencil className="h-3 w-3" /> Edit {label}
        </span>
      </div>
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await onSave(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
    });
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-3 rounded-md border border-blue-200 bg-blue-50/40 p-3"
    >
      {renderEditor()}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          className="cursor-pointer transition-transform active:scale-95"
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => {
            setError(null);
            setIsEditing(false);
          }}
          className="cursor-pointer transition-transform active:scale-95"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
