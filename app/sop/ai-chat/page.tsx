import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SopAiChatPanel } from "@/components/sop/SopAiChatPanel";

// Open to every authenticated role (staff, document_controller, admin) —
// this is also the page an external auditor would be shown, so it
// deliberately only ever surfaces PUBLISHED SOP content. That's enforced
// at the data layer: search_sop_chunks() only reads sop_content_chunks,
// and that table is only ever populated from published versions (see
// regenerate_sop_content_chunks() in sql/007_ai_chat_support.sql).
export default function SopAiChatPage() {
  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>SOP Assistant</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ask questions about any published procedure. Every answer includes
            the exact SOP number and a link back to the source document for
            verification — useful during internal or external audits.
          </p>
        </CardHeader>
        <CardContent>
          <SopAiChatPanel />
        </CardContent>
      </Card>
    </div>
  );
}
