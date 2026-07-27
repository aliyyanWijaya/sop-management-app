"use server";

import { createClient } from "@/lib/supabase/server";

export type SopCitation = {
  sop_id: string;
  document_number: string;
  title: string;
  section_label: string;
  quote: string;
};

export type SopAssistantAnswer = {
  answer: string;
  citations: SopCitation[];
};

// NOTE: verify this against the current list of available models before
// shipping — model names/availability change over time.
const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `You are an internal SOP assistant used by staff and external auditors.
Answer ONLY using the SOP excerpts provided in the user message — never use outside
knowledge about imports, warehousing, purchasing, or quality procedures, even if you
believe you already know the answer.
If the excerpts don't cover the question, say so explicitly instead of guessing.
Every factual claim in your answer must be backed by at least one excerpt.
Respond with ONLY valid JSON (no markdown fences, no preamble), matching this shape exactly:
{
  "answer": "string, plain-language explanation for the user",
  "citations": [
    { "document_number": "string, e.g. SOP-OPS-0004", "section_label": "string, copied from the excerpt", "quote": "short exact quote (<= 25 words) from that excerpt supporting the answer" }
  ]
}
If none of the excerpts are relevant, return {"answer": "...", "citations": []}.`;

export async function askSopAssistant(
  question: string,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<SopAssistantAnswer> {
  const supabase = await createClient();

  // Retrieval step — keyword search over PUBLISHED-SOP chunks only
  // (see sql/007_ai_chat_support.sql). Runs as the logged-in user, so
  // this can never surface draft/in-review content, which matters both
  // for staff and for anyone using this during an external audit.
  const { data: chunks, error: searchError } = await supabase.rpc(
    "search_sop_chunks",
    {
      p_query: question,
      p_limit: 8,
    },
  );

  if (searchError) {
    return {
      answer:
        "Sorry, the SOP search is unavailable right now. Please try again shortly.",
      citations: [],
    };
  }

  if (!chunks || chunks.length === 0) {
    return {
      answer:
        "I couldn't find any published SOP content matching that question. Try rephrasing it, or check with the Quality department if this procedure may not be documented yet.",
      citations: [],
    };
  }

  // Map document_number -> sop_id so real links can be attached after
  // the model responds. The model itself only ever sees document
  // numbers / section labels / text — never raw UUIDs — which keeps
  // the prompt clean and means it can't invent a broken link.
  const sopIdByDocNumber = new Map(
    chunks.map((c) => [c.document_number, c.sop_id]),
  );

  const contextBlock = chunks
    .map(
      (c, i) =>
        `[Excerpt ${i + 1}] SOP ${c.document_number} — "${c.title}", Section: ${c.section_label}\n${c.content_text}`,
    )
    .join("\n\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
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

  if (!response.ok) {
    const errText = await response.text();
    console.error("Anthropic API error:", response.status, errText);
    return {
      answer:
        "Sorry, the SOP assistant is temporarily unavailable. Please try again shortly.",
      citations: [],
    };
  }

  const data = await response.json();
  const rawText: string =
    data.content?.find((block: { type: string }) => block.type === "text")
      ?.text ?? "{}";

  let parsed: {
    answer: string;
    citations: {
      document_number: string;
      section_label: string;
      quote: string;
    }[];
  };

  try {
    parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
  } catch {
    // Model didn't return clean JSON — fall back to showing the raw
    // text rather than crashing the chat.
    return { answer: rawText, citations: [] };
  }

  const citations: SopCitation[] = (parsed.citations ?? [])
    .filter((c) => sopIdByDocNumber.has(c.document_number))
    .map((c) => ({
      sop_id: sopIdByDocNumber.get(c.document_number)!,
      document_number: c.document_number,
      title:
        chunks.find((ch) => ch.document_number === c.document_number)?.title ??
        "",
      section_label: c.section_label,
      quote: c.quote,
    }));

  return { answer: parsed.answer, citations };
}

// ---------------------------------------------------------
// Read-only SOP fetch for the AI chat's inline preview panel.
// Deliberately trimmed down vs app/sop/[id]/page.tsx — no approval
// history, no reviewer/approver ids, no action forms — since this is
// only ever rendered next to the chat as a "verify the source" view.
// RLS (sops_select_published_to_all) already guarantees only published
// SOPs come back here for a normal staff/auditor user, which matches
// what the assistant is allowed to cite in the first place.
// ---------------------------------------------------------
export type SopPreviewData = {
  id: string;
  title: string;
  document_number: string;
  status: string;
  category: { name: string } | null;
  version: {
    id: string;
    version_number: number;
    status: string;
    content: any;
    created_at: string;
    reviewed_at: string | null;
    approved_at: string | null;
    published_at: string | null;
    valid_until: string | null;
    author: { name: string } | null;
    reviewer: { name: string } | null;
    approver: { name: string } | null;
  } | null;
};

export async function getSopPreview(
  sopId: string,
): Promise<SopPreviewData | null> {
  const supabase = await createClient();

  const { data: sop } = await supabase
    .from("sops")
    .select(
      `
      id, title, document_number, status,
      category:sop_categories ( name ),
      current_version:sop_versions!fk_sops_current_version (
        id, version_number, status, content,
        created_at, reviewed_at, approved_at, published_at, valid_until,
        author:users!sop_versions_author_id_fkey ( name ),
        reviewer:users!sop_versions_reviewer_id_fkey ( name ),
        approver:users!sop_versions_approver_id_fkey ( name )
      )
    `,
    )
    .eq("id", sopId)
    .single();

  if (!sop) return null;

  const rawVersion = Array.isArray(sop.current_version)
    ? sop.current_version[0]
    : sop.current_version;
  const category = Array.isArray(sop.category) ? sop.category[0] : sop.category;

  const version = rawVersion
    ? {
        id: rawVersion.id,
        version_number: rawVersion.version_number,
        status: rawVersion.status,
        content: rawVersion.content,
        created_at: rawVersion.created_at,
        reviewed_at: rawVersion.reviewed_at,
        approved_at: rawVersion.approved_at,
        published_at: rawVersion.published_at,
        valid_until: rawVersion.valid_until,
        author: Array.isArray(rawVersion.author)
          ? rawVersion.author[0]
          : rawVersion.author,
        reviewer: Array.isArray(rawVersion.reviewer)
          ? rawVersion.reviewer[0]
          : rawVersion.reviewer,
        approver: Array.isArray(rawVersion.approver)
          ? rawVersion.approver[0]
          : rawVersion.approver,
      }
    : null;

  return {
    id: sop.id,
    title: sop.title,
    document_number: sop.document_number,
    status: sop.status,
    category: category ?? null,
    version,
  };
}
