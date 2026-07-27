"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SopAiChatPanel } from "@/components/sop/SopAiChatPanel";
import {
  SopPreviewPanel,
  type SopPreviewTarget,
} from "@/components/sop/SopPreviewPanel";

export function SopAiChatWorkspace() {
  const [preview, setPreview] = useState<SopPreviewTarget | null>(null);

  return (
    <div className="flex items-start gap-4">
      <Card className="min-w-0 flex-1">
        <CardHeader>
          <CardTitle>SOP Assistant</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ask questions about any published procedure. Every answer cites the
            exact SOP number — click it to preview the source section right
            here, without leaving the chat.
          </p>
        </CardHeader>
        <CardContent>
          <SopAiChatPanel onOpenSop={setPreview} />
        </CardContent>
      </Card>

      {preview && (
        <div className="w-full max-w-md shrink-0">
          <SopPreviewPanel target={preview} onClose={() => setPreview(null)} />
        </div>
      )}
    </div>
  );
}
