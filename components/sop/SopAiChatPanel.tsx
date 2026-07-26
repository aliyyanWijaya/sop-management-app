"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { askSopAssistant, type SopCitation } from "@/app/sop/ai-chat/actions";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: SopCitation[];
};

export function SopAiChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const question = input.trim();
    if (!question || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      // Only role/content is sent back as conversation history — citations
      // are UI-only metadata, not part of what Claude sees on the next turn.
      const history = nextMessages
        .slice(0, -1)
        .map(({ role, content }) => ({ role, content }));
      const result = await askSopAssistant(question, history);
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: result.answer,
          citations: result.citations,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col gap-3">
      <div className="flex-1 space-y-3 overflow-y-auto rounded-md border bg-muted/20 p-4">
        {messages.length === 0 && (
          <p className="text-sm italic text-muted-foreground">
            Ask a question about any published SOP — e.g. &quot;What are the
            purchase order approval limits?&quot; or &quot;How is imported raw
            material inspected on arrival?&quot;
          </p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "text-right" : "text-left"}
          >
            <div
              className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border bg-background"
              }`}
            >
              {m.content}
            </div>

            {m.citations && m.citations.length > 0 && (
              <div className="mt-2 space-y-2">
                {m.citations.map((c, ci) => (
                  <Card key={ci} className="border-dashed">
                    <CardContent className="space-y-1 p-3 text-left text-xs">
                      <p className="font-mono font-medium text-muted-foreground">
                        {c.document_number} — {c.title}
                      </p>
                      <p className="text-muted-foreground">{c.section_label}</p>
                      <p className="italic">&quot;{c.quote}&quot;</p>
                      <Link
                        href={`/sop/${c.sop_id}`}
                        target="_blank"
                        className="inline-block underline"
                      >
                        View SOP to verify →
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && <p className="text-xs text-muted-foreground">Thinking…</p>}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask about any SOP procedure…"
          rows={2}
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={loading}
          className="cursor-pointer transition-transform active:scale-95"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
