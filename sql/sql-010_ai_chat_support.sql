-- =========================================================
-- Support for the SOP AI Assistant: searchable, flattened text
-- chunks derived from PUBLISHED sop_versions.content, plus a
-- Postgres full-text search index.
--
-- Chunks are regenerated automatically whenever a version is
-- published — see the call to regenerate_sop_content_chunks()
-- that needs to be added to approverDecision() in
-- app/sop/[id]/actions.ts (see accompanying snippet).
--
-- Design choice: full-text search (tsvector) rather than vector
-- embeddings. Simpler to run (no embedding API calls needed on
-- every publish), and works well for this use case since audit
-- questions ("how do we import goods", "storage temperature for
-- pharma") map closely to the actual words used in the SOPs.
-- If richer semantic search is needed later, add a `pgvector`
-- column here and populate it the same way.
-- =========================================================

create table sop_content_chunks (
  id                uuid primary key default gen_random_uuid(),
  sop_id            uuid not null references sops(id) on delete cascade,
  sop_version_id    uuid not null references sop_versions(id) on delete cascade,
  document_number   text not null,
  title             text not null,
  section_key       text not null,   -- e.g. 'purpose', 'procedure_step_2'
  section_label     text not null,   -- e.g. '6.0 Procedure — Step 2: Goods Receiving'
  content_text      text not null,
  search_vector     tsvector generated always as (to_tsvector('english', content_text)) stored,
  created_at        timestamptz not null default now()
);

create index idx_sop_chunks_search on sop_content_chunks using gin(search_vector);
create index idx_sop_chunks_sop_id on sop_content_chunks(sop_id);

-- RLS: readable by any authenticated user. Chunks only ever exist for
-- the currently PUBLISHED version of a SOP (see the function below),
-- so this table can never leak draft/in-review content — there is
-- deliberately no insert/update/delete policy for regular clients.
alter table sop_content_chunks enable row level security;

create policy "sop_chunks_select_authenticated"
  on sop_content_chunks for select
  using (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- Function: wipe and rebuild the chunks for one SOP whenever a new
-- version is published. SECURITY DEFINER because there is
-- intentionally no direct write policy on sop_content_chunks.
-- ---------------------------------------------------------
create or replace function regenerate_sop_content_chunks(
  p_sop_id uuid,
  p_sop_version_id uuid,
  p_document_number text,
  p_title text,
  p_content jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_step jsonb;
  v_step_index int := 0;
  v_ref jsonb;
  v_def jsonb;
  v_role jsonb;
begin
  -- The previous published version's chunks become obsolete the
  -- moment a new version replaces it, so we clear them first.
  delete from sop_content_chunks where sop_id = p_sop_id;

  if length(trim(coalesce(p_content->>'purpose', ''))) > 0 then
    insert into sop_content_chunks
      (sop_id, sop_version_id, document_number, title, section_key, section_label, content_text)
    values
      (p_sop_id, p_sop_version_id, p_document_number, p_title,
       'purpose', '1.0 Purpose', p_content->>'purpose');
  end if;

  if (p_content #>> '{scope,applies_to}') is not null then
    insert into sop_content_chunks
      (sop_id, sop_version_id, document_number, title, section_key, section_label, content_text)
    values
      (p_sop_id, p_sop_version_id, p_document_number, p_title,
       'scope', '2.0 Scope',
       'Applies to: ' || (p_content #>> '{scope,applies_to}') ||
       coalesce(' | Does not apply to: ' || (p_content #>> '{scope,excludes}'), ''));
  end if;

  for v_ref in select * from jsonb_array_elements(coalesce(p_content->'references', '[]'::jsonb))
  loop
    insert into sop_content_chunks
      (sop_id, sop_version_id, document_number, title, section_key, section_label, content_text)
    values
      (p_sop_id, p_sop_version_id, p_document_number, p_title,
       'reference', '3.0 References', (v_ref->>'doc_number') || ' — ' || (v_ref->>'title'));
  end loop;

  for v_def in select * from jsonb_array_elements(coalesce(p_content->'definitions', '[]'::jsonb))
  loop
    insert into sop_content_chunks
      (sop_id, sop_version_id, document_number, title, section_key, section_label, content_text)
    values
      (p_sop_id, p_sop_version_id, p_document_number, p_title,
       'definition', '4.0 Definitions', (v_def->>'term') || ': ' || (v_def->>'definition'));
  end loop;

  for v_role in select * from jsonb_array_elements(coalesce(p_content->'roles_responsibilities', '[]'::jsonb))
  loop
    insert into sop_content_chunks
      (sop_id, sop_version_id, document_number, title, section_key, section_label, content_text)
    values
      (p_sop_id, p_sop_version_id, p_document_number, p_title,
       'role', '5.0 Roles and Responsibilities', (v_role->>'role') || ': ' || (v_role->>'responsibility'));
  end loop;

  for v_step in select * from jsonb_array_elements(coalesce(p_content->'procedure', '[]'::jsonb))
  loop
    v_step_index := v_step_index + 1;
    insert into sop_content_chunks
      (sop_id, sop_version_id, document_number, title, section_key, section_label, content_text)
    values
      (p_sop_id, p_sop_version_id, p_document_number, p_title,
       'procedure_step_' || v_step_index,
       '6.0 Procedure — Step ' || v_step_index || ': ' || (v_step->>'major_step'),
       (v_step->>'major_step') || '. Actions: ' ||
       coalesce((select string_agg(a, '; ') from jsonb_array_elements_text(v_step->'actions') a), '') ||
       coalesce('. Notes: ' || (select string_agg(n, '; ') from jsonb_array_elements_text(v_step->'notes') n), ''));
  end loop;
end;
$$;

grant execute on function regenerate_sop_content_chunks(uuid, uuid, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------
-- Function: keyword search over the chunks, used by the AI
-- assistant's retrieval step before calling the LLM.
-- websearch_to_tsquery handles tokenizing/stopwords for us, so
-- the caller can just pass the user's raw question.
-- ---------------------------------------------------------
create or replace function search_sop_chunks(p_query text, p_limit int default 8)
returns table (
  sop_id uuid,
  document_number text,
  title text,
  section_label text,
  content_text text,
  rank real
)
language sql
security definer
stable
as $$
  select
    c.sop_id, c.document_number, c.title, c.section_label, c.content_text,
    ts_rank(c.search_vector, websearch_to_tsquery('english', p_query)) as rank
  from sop_content_chunks c
  where c.search_vector @@ websearch_to_tsquery('english', p_query)
  order by rank desc
  limit p_limit;
$$;

grant execute on function search_sop_chunks(text, int) to authenticated;
