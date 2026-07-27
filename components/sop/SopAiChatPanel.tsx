"use client";

import { useState, useRef, useEffect } from "react";
import { type SopPreviewTarget } from "@/components/sop/SopPreviewPanel";
import { Bot, User, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

type SopCitation = {
  sop_id: string;
  document_number: string;
  title: string;
  section_label: string;
  quote: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: SopCitation[];
};

const SUGGESTED_PROMPTS = [
  "What are the purchase order approval limits?",
  "How is imported raw material inspected on arrival?",
  "What storage zones exist for pharma-grade material?",
  "How do we handle a customer complaint?",
];

const DISPLAY_CUT_MARKER = "@@@CITATIONS@@@";
const CITATIONS_RESULT_MARKER = "@@@CITATIONS_RESULT@@@";

// Lightweight markdown renderer: only handles **bold** and "- " bullet
// lists, which is all the assistant prompt is instructed to produce.
// Deliberately no external markdown package — this keeps rendering
// cheap enough to re-run on every streamed chunk.
function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    ),
  );
}

function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={key} className="list-disc space-y-1 pl-4">
        {listBuffer.map((item, i) => (
          <li key={`${key}-li-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listBuffer.push(trimmed.slice(2));
      return;
    }
    flushList(`list-${idx}`);
    if (trimmed.length > 0) {
      blocks.push(
        <p key={`p-${idx}`} className="leading-relaxed">
          {renderInline(trimmed, `p-${idx}`)}
        </p>,
      );
    }
  });
  flushList("list-end");

  return <div className="space-y-2">{blocks}</div>;
}

export function SopAiChatPanel({
  onOpenSop,
}: {
  onOpenSop: (target: SopPreviewTarget) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingStarted, setStreamingStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function sendMessage(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setStreamingStarted(false);

    const history = nextMessages
      .slice(0, -1)
      .map(({ role, content }) => ({ role, content }));

    let assistantAdded = false;

    try {
      const res = await fetch("/sop/ai-chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const displayText = buffer.split(DISPLAY_CUT_MARKER)[0];
        if (displayText.length === 0) continue;

        setStreamingStarted(true);
        setMessages((prev) => {
          if (!assistantAdded) {
            assistantAdded = true;
            return [
              ...prev,
              { role: "assistant", content: displayText, citations: [] },
            ];
          }
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: displayText,
          };
          return updated;
        });
      }

      const resultIdx = buffer.indexOf(CITATIONS_RESULT_MARKER);
      let citations: SopCitation[] = [];
      if (resultIdx !== -1) {
        try {
          citations = JSON.parse(
            buffer.slice(resultIdx + CITATIONS_RESULT_MARKER.length),
          );
        } catch {
          citations = [];
        }
      }
      const finalText = buffer.split(DISPLAY_CUT_MARKER)[0];

      setMessages((prev) => {
        const updated = [...prev];
        if (assistantAdded) {
          updated[updated.length - 1] = {
            role: "assistant",
            content: finalText,
            citations,
          };
        } else {
          updated.push({ role: "assistant", content: finalText, citations });
        }
        return updated;
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          citations: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border">
      {/* Status bar */}
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
        <span className="relative flex size-2">
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${
              loading ? "animate-ping bg-amber-400" : "bg-emerald-500"
            } opacity-75`}
          />
          <span
            className={`relative inline-flex size-2 rounded-full ${
              loading ? "bg-amber-500" : "bg-emerald-500"
            }`}
          />
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {loading ? "Searching SOPs…" : "Ready"}
        </span>
      </div>

      {/* Message area */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Ask about any published SOP</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Answers always cite the exact SOP number — click through to
                verify.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="cursor-pointer rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {m.role === "user" ? (
                <User className="size-4" />
              ) : (
                <Bot className="size-4" />
              )}
            </div>

            <div
              className={`max-w-[80%] space-y-2 ${m.role === "user" ? "items-end" : ""}`}
            >
              <div
                className={`rounded-2xl px-3.5 py-2 text-sm ${
                  m.role === "user"
                    ? "rounded-tr-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm border bg-background"
                }`}
              >
                {m.role === "assistant" ? (
                  <MarkdownLite text={m.content} />
                ) : (
                  m.content
                )}
              </div>

              {m.citations && m.citations.length > 0 && (
                <div className="space-y-1.5">
                  {m.citations.map((c, ci) => (
                    <Card key={ci} className="border-dashed">
                      <CardContent className="space-y-1 p-3 text-xs">
                        <p className="font-mono font-medium text-muted-foreground">
                          {c.document_number} — {c.title}
                        </p>
                        <p className="text-muted-foreground">
                          {c.section_label}
                        </p>
                        <p className="italic">&quot;{c.quote}&quot;</p>
                        <button
                          type="button"
                          onClick={() =>
                            onOpenSop({
                              sopId: c.sop_id,
                              documentNumber: c.document_number,
                              sectionLabel: c.section_label,
                              quote: c.quote,
                            })
                          }
                          className="inline-block cursor-pointer text-left underline underline-offset-2 hover:text-primary"
                        >
                          View SOP to verify →
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && !streamingStarted && (
          <div className="flex gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Bot className="size-4" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border bg-background px-3.5 py-2.5">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-end gap-2 border-t bg-background p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          placeholder="Ask about any SOP procedure…"
          rows={1}
          className="min-h-9 flex-1 resize-none rounded-full px-4 py-2"
        />
        <Button
          size="icon"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="shrink-0 cursor-pointer rounded-full transition-transform active:scale-95"
        >
          <SendHorizontal className="size-4" />
        </Button>
      </div>
    </div>
  );
}
