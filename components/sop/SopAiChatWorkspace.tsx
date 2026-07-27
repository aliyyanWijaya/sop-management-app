"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SopAiChatPanel } from "@/components/sop/SopAiChatPanel";
import {
  SopPreviewPanel,
  type SopPreviewTarget,
} from "@/components/sop/SopPreviewPanel";

// Layout behaviour:
// - No SOP open yet -> single centered column, Claude-style chat
//   (max-w-2xl, centered with mx-auto) — the outer row stays full
//   width so the centering isn't fighting a max-w cap on the parent.
// - SOP opened from a citation -> splits into two even columns that
//   fill the FULL available width (chat left, source preview right),
//   so there's no leftover whitespace on either side of the screen.
export function SopAiChatWorkspace() {
  const [preview, setPreview] = useState<SopPreviewTarget | null>(null);

  return (
    <div className="flex h-[calc(100vh-7rem)] w-full gap-4">
      <Card
        className={`flex min-w-0 flex-col overflow-hidden ${
          preview ? "flex-1" : "mx-auto w-full max-w-3xl"
        }`}
      >
        <CardHeader className="shrink-0">
          <CardTitle>SOP Assistant</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ask questions about any published procedure. Every answer cites the
            exact SOP number — click it to preview the source section right
            here, without leaving the chat.
          </p>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-hidden">
          <SopAiChatPanel onOpenSop={setPreview} />
        </CardContent>
      </Card>

      {preview && (
        <div className="min-w-0 flex-1">
          <SopPreviewPanel target={preview} onClose={() => setPreview(null)} />
        </div>
      )}
    </div>
  );
}
