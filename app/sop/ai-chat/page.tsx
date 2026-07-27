import { SopAiChatWorkspace } from "@/components/sop/SopAiChatWorkspace";

// Open to every authenticated role (staff, document_controller, admin) —
// this is also the page an external auditor would be shown, so it
// deliberately only ever surfaces PUBLISHED SOP content. That's enforced
// at the data layer: search_sop_chunks() only reads sop_content_chunks,
// and that table is only ever populated from published versions (see
// regenerate_sop_content_chunks() in sql/007_ai_chat_support.sql).
export default function SopAiChatPage() {
  return (
    <div className="max-w-5xl">
      <SopAiChatWorkspace />
    </div>
  );
}
