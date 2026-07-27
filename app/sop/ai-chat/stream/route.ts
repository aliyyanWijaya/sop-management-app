import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// NOTE: verify this against the current list of available models before
// shipping — model names/availability change over time.
const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `You are an internal SOP assistant used by staff and external auditors.
Answer ONLY using the SOP excerpts provided in the user message — never use outside
knowledge about imports, warehousing, purchasing, or quality procedures, even if you
believe you already know the answer.
If the excerpts don't cover the question, say so explicitly instead of guessing.
Every factual claim in your answer must be backed by at least one excerpt.

Format the answer as plain markdown text (no JSON, no code fences):
- Start with ONE short paragraph (1-2 sentences) that states the direct answer.
- If there are multiple points, follow with a bullet list. Each bullet starts with "- ",
  and the key term of that bullet must be wrapped in **bold**, e.g. "- **Purpose**: ...".
- Do not use headings (#) or numbered lists. Keep it concise.

After the answer, on its own new line, output exactly the marker @@@CITATIONS@@@ followed
by a raw JSON array (no markdown fences) containing AT MOST ONE object — the single SOP
excerpt that most directly and specifically supports the answer:
[{ "document_number": "string, e.g. SOP-OPS-0004", "section_label": "string, copied from the excerpt", "quote": "short exact quote (<= 25 words) from that excerpt" }]
If nothing in the excerpts is relevant, output an empty array [] after the marker.`;

type ChunkRow = {
  sop_id: string;
  document_number: string;
  title: string;
  section_label: string;
  content_text: string;
};

function streamPlainText(text: string) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}

export async function POST(req: Request) {
  const { question, history } = (await req.json()) as {
    question: string;
    history: { role: "user" | "assistant"; content: string }[];
  };

  const supabase = await createClient();

  // Retrieval step — keyword search over PUBLISHED-SOP chunks only,
  // identical scope/guarantees as the previous non-streaming action.
  const { data: chunks, error: searchError } = await supabase.rpc(
    "search_sop_chunks",
    {
      p_query: question,
      p_limit: 8,
    },
  );

  if (searchError) {
    return streamPlainText(
      "Sorry, the SOP search is unavailable right now. Please try again shortly.\n@@@CITATIONS_RESULT@@@[]",
    );
  }

  if (!chunks || chunks.length === 0) {
    return streamPlainText(
      "I couldn't find any published SOP content matching that question. Try rephrasing it, or check with the Quality department if this procedure may not be documented yet.\n@@@CITATIONS_RESULT@@@[]",
    );
  }

  const rows = chunks as ChunkRow[];

  // Map document_number -> {sop_id, title} so real links can be attached
  // after the model responds. The model never sees raw UUIDs.
  const sopMetaByDocNumber = new Map(
    rows.map((c) => [c.document_number, { sop_id: c.sop_id, title: c.title }]),
  );

  const contextBlock = rows
    .map(
      (c, i) =>
        `[Excerpt ${i + 1}] SOP ${c.document_number} — "${c.title}", Section: ${c.section_label}\n${c.content_text}`,
    )
    .join("\n\n");

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [
        ...history,
        {
          role: "user",
          content: `SOP excerpts:\n\n${contextBlock}\n\nQuestion: ${question}`,
        },
      ],
    }),
  });

  if (!anthropicRes.ok || !anthropicRes.body) {
    return streamPlainText(
      "Sorry, something went wrong generating the answer.\n@@@CITATIONS_RESULT@@@[]",
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body!.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });

        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            if (
              evt.type === "content_block_delta" &&
              evt.delta?.type === "text_delta"
            ) {
              const text: string = evt.delta.text;
              fullText += text;
              // Forward raw text immediately — the client filters out
              // everything after @@@CITATIONS@@@ before rendering, so
              // the model's own draft citations JSON is never shown.
              controller.enqueue(encoder.encode(text));
            }
          } catch {
            // Ignore malformed/partial SSE fragments.
          }
        }
      }

      const marker = "@@@CITATIONS@@@";
      const markerIndex = fullText.indexOf(marker);
      let citationsRaw: {
        document_number: string;
        section_label: string;
        quote: string;
      }[] = [];
      if (markerIndex !== -1) {
        try {
          citationsRaw = JSON.parse(
            fullText.slice(markerIndex + marker.length).trim(),
          );
        } catch {
          citationsRaw = [];
        }
      }

      // Server-side enforcement: only ONE validated citation ever goes
      // out, regardless of what the model returned.
      const validatedCitations = citationsRaw
        .filter((c) => sopMetaByDocNumber.has(c.document_number))
        .slice(0, 1)
        .map((c) => {
          const meta = sopMetaByDocNumber.get(c.document_number)!;
          return {
            sop_id: meta.sop_id,
            document_number: c.document_number,
            title: meta.title,
            section_label: c.section_label,
            quote: c.quote,
          };
        });

      controller.enqueue(
        encoder.encode(
          "\n@@@CITATIONS_RESULT@@@" + JSON.stringify(validatedCitations),
        ),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
