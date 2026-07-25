// Taruh di: components/sop/SopEditableBlocks.tsx
"use client";

import { EditableBlock } from "./EditableBlock";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DynamicListEditor } from "./DynamicListEditor";
import { ProcedureEditor } from "./ProcedureEditor";

type SaveResult = { error?: string } | void;
type SaveAction = (formData: FormData) => Promise<SaveResult>;

type Reference = { title: string; doc_number: string };
type Definition = { term: string; definition: string };
type RoleResponsibility = { role: string; responsibility: string };
type ProcedureStep = { major_step: string; actions: string[]; notes: string[] };
type Appendix = { type: string; description: string; file_url: string };

// ---------------------------------------------------------
// Title
// ---------------------------------------------------------
export function TitleBlock({
  title,
  onSave,
  editable,
}: {
  title: string;
  onSave: SaveAction;
  editable: boolean;
}) {
  return (
    <EditableBlock
      editable={editable}
      label="title"
      onSave={onSave}
      renderEditor={() => (
        <div>
          <label className="mb-1 block text-sm font-medium">SOP Title</label>
          <Input name="title" defaultValue={title} required />
        </div>
      )}
    >
      <h1 className="text-xl font-semibold">{title}</h1>
    </EditableBlock>
  );
}

// ---------------------------------------------------------
// Purpose
// ---------------------------------------------------------
export function PurposeBlock({
  purpose,
  onSave,
  editable,
}: {
  purpose: string;
  onSave: SaveAction;
  editable: boolean;
}) {
  return (
    <EditableBlock
      editable={editable}
      label="purpose"
      onSave={onSave}
      renderEditor={() => (
        <div>
          <label className="mb-1 block text-sm font-medium">1.0 Purpose</label>
          <Textarea name="purpose" defaultValue={purpose} required rows={3} />
        </div>
      )}
    >
      <p className="text-sm">
        <span className="font-medium">1.0 Purpose: </span>
        {purpose || (
          <span className="italic text-muted-foreground">
            not filled in yet
          </span>
        )}
      </p>
    </EditableBlock>
  );
}

// ---------------------------------------------------------
// Scope
// ---------------------------------------------------------
export function ScopeBlock({
  appliesTo,
  excludes,
  onSave,
  editable,
}: {
  appliesTo: string;
  excludes: string;
  onSave: SaveAction;
  editable: boolean;
}) {
  return (
    <EditableBlock
      editable={editable}
      label="scope"
      onSave={onSave}
      renderEditor={() => (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              2.0 Scope — Applies to
            </label>
            <Textarea
              name="scope_applies_to"
              defaultValue={appliesTo}
              required
              rows={2}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Scope — Does not apply to{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea name="scope_excludes" defaultValue={excludes} rows={2} />
          </div>
        </div>
      )}
    >
      <div className="space-y-1">
        <p className="text-sm">
          <span className="font-medium">2.0 Scope — Applies to: </span>
          {appliesTo || (
            <span className="italic text-muted-foreground">
              not filled in yet
            </span>
          )}
        </p>
        {excludes && (
          <p className="text-sm">
            <span className="font-medium">Scope — Does not apply to: </span>
            {excludes}
          </p>
        )}
      </div>
    </EditableBlock>
  );
}

// ---------------------------------------------------------
// References
// ---------------------------------------------------------
export function ReferencesBlock({
  references,
  onSave,
  editable,
}: {
  references: Reference[];
  onSave: SaveAction;
  editable: boolean;
}) {
  return (
    <EditableBlock
      editable={editable}
      label="references"
      onSave={onSave}
      renderEditor={() => (
        <DynamicListEditor
          name="references_json"
          title="3.0 References & Related Documents"
          fields={[
            {
              key: "doc_number",
              label: "Doc. Number",
              placeholder: "e.g. SOP-QA-002",
            },
            {
              key: "title",
              label: "Title",
              placeholder: "e.g. SOP-QA-002 Equipment Calibration",
            },
          ]}
          initialItems={references}
          addLabel="Add reference"
        />
      )}
    >
      {references.length > 0 ? (
        <div className="text-sm">
          <p className="font-medium">3.0 References &amp; Related Documents</p>
          <ul className="ml-4 list-disc text-muted-foreground">
            {references.map((ref, i) => (
              <li key={i}>
                {ref.doc_number && `${ref.doc_number} — `}
                {ref.title}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          3.0 References &amp; Related Documents — none yet
        </p>
      )}
    </EditableBlock>
  );
}

// ---------------------------------------------------------
// Definitions
// ---------------------------------------------------------
export function DefinitionsBlock({
  definitions,
  onSave,
  editable,
}: {
  definitions: Definition[];
  onSave: SaveAction;
  editable: boolean;
}) {
  return (
    <EditableBlock
      editable={editable}
      label="definitions"
      onSave={onSave}
      renderEditor={() => (
        <DynamicListEditor
          name="definitions_json"
          title="4.0 Definitions"
          fields={[
            { key: "term", label: "Term", placeholder: "e.g. CAPA" },
            {
              key: "definition",
              label: "Definition",
              placeholder: "e.g. Corrective and Preventive Action",
            },
          ]}
          initialItems={definitions}
          addLabel="Add definition"
        />
      )}
    >
      {definitions.length > 0 ? (
        <div className="text-sm">
          <p className="font-medium">4.0 Definitions</p>
          <ul className="ml-4 list-disc text-muted-foreground">
            {definitions.map((def, i) => (
              <li key={i}>
                <span className="font-medium text-foreground">{def.term}</span>:{" "}
                {def.definition}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          4.0 Definitions — none yet
        </p>
      )}
    </EditableBlock>
  );
}

// ---------------------------------------------------------
// Roles and Responsibilities
// ---------------------------------------------------------
export function RolesBlock({
  roles,
  onSave,
  editable,
}: {
  roles: RoleResponsibility[];
  onSave: SaveAction;
  editable: boolean;
}) {
  return (
    <EditableBlock
      editable={editable}
      label="roles and responsibilities"
      onSave={onSave}
      renderEditor={() => (
        <DynamicListEditor
          name="roles_responsibilities_json"
          title="5.0 Roles and Responsibilities"
          fields={[
            { key: "role", label: "Role", placeholder: "e.g. QA Officer" },
            {
              key: "responsibility",
              label: "Responsibility",
              placeholder: "e.g. Performs daily equipment checks",
            },
          ]}
          initialItems={roles}
          addLabel="Add role"
        />
      )}
    >
      {roles.length > 0 ? (
        <div className="text-sm">
          <p className="font-medium">5.0 Roles and Responsibilities</p>
          <ul className="ml-4 list-disc text-muted-foreground">
            {roles.map((r, i) => (
              <li key={i}>
                <span className="font-medium text-foreground">{r.role}</span>:{" "}
                {r.responsibility}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          5.0 Roles and Responsibilities — none yet
        </p>
      )}
    </EditableBlock>
  );
}

// ---------------------------------------------------------
// Procedure
// ---------------------------------------------------------
export function ProcedureBlock({
  procedure,
  onSave,
  editable,
}: {
  procedure: ProcedureStep[];
  onSave: SaveAction;
  editable: boolean;
}) {
  return (
    <EditableBlock
      editable={editable}
      label="procedure"
      onSave={onSave}
      renderEditor={() => (
        <ProcedureEditor name="procedure_json" initialSteps={procedure} />
      )}
    >
      {procedure.length > 0 ? (
        <div className="text-sm">
          <p className="font-medium">6.0 Procedure</p>
          <ol className="ml-4 list-decimal space-y-2 text-muted-foreground">
            {procedure.map((step, i) => (
              <li key={i}>
                <span className="font-medium text-foreground">
                  {step.major_step}
                </span>
                {step.actions?.length > 0 && (
                  <ul className="ml-4 list-disc">
                    {step.actions.map((action, j) => (
                      <li key={j}>{action}</li>
                    ))}
                  </ul>
                )}
                {step.notes?.length > 0 && (
                  <p className="mt-1 text-xs italic">
                    Note: {step.notes.join(" • ")}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          6.0 Procedure — none yet
        </p>
      )}
    </EditableBlock>
  );
}

// ---------------------------------------------------------
// Appendices
// ---------------------------------------------------------
export function AppendicesBlock({
  appendices,
  onSave,
  editable,
}: {
  appendices: Appendix[];
  onSave: SaveAction;
  editable: boolean;
}) {
  return (
    <EditableBlock
      editable={editable}
      label="appendices"
      onSave={onSave}
      renderEditor={() => (
        <DynamicListEditor
          name="appendices_json"
          title="7.0 Appendices"
          fields={[
            { key: "type", label: "Type", placeholder: "e.g. flowchart" },
            {
              key: "description",
              label: "Description",
              placeholder: "e.g. Inspection flow diagram",
            },
            {
              key: "file_url",
              label: "File URL",
              placeholder: "e.g. https://...",
            },
          ]}
          initialItems={appendices}
          addLabel="Add appendix"
        />
      )}
    >
      {appendices.length > 0 ? (
        <div className="text-sm">
          <p className="font-medium">7.0 Appendices</p>
          <ul className="ml-4 list-disc text-muted-foreground">
            {appendices.map((a, i) => (
              <li key={i}>
                {a.description} {a.type && `(${a.type})`}
                {a.file_url && (
                  <>
                    {" — "}
                    <a href={a.file_url} className="underline" target="_blank">
                      view
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          7.0 Appendices — none yet
        </p>
      )}
    </EditableBlock>
  );
}
