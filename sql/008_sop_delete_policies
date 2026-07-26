-- =========================================================
-- Allow deleting a SOP while it is still in draft — by the author of
-- its current version, or by a Document Controller/Admin.
-- =========================================================
-- None of these tables currently have a DELETE policy, so without this,
-- the "Delete SOP" action fails silently under RLS. Deletion is scoped
-- to `status = 'draft'` only — once a SOP has moved into review/approval/
-- published, it can no longer be deleted this way (by design: it's part
-- of the audit trail at that point).
--
-- Note: this assumes a draft SOP has exactly one sop_versions row (true
-- today, since there's no "start a new revision of a published SOP"
-- feature yet — the reviewer "request revision" flow reuses the same
-- version row rather than creating a new one). If a future feature adds
-- new-version-from-published, this policy will need to be revisited so
-- older superseded/published version rows aren't caught up in a delete.

create policy "sops_delete_draft_owner_or_admin"
  on sops for delete
  using (
    status = 'draft'
    and (
      is_admin_or_dc()
      or exists (
        select 1 from sop_versions v
        where v.sop_id = sops.id and v.author_id = auth.uid()
      )
    )
  );

create policy "sop_versions_delete_draft_owner_or_admin"
  on sop_versions for delete
  using (
    status = 'draft'
    and (author_id = auth.uid() or is_admin_or_dc())
  );

create policy "approval_actions_delete_with_version_owner_or_admin"
  on approval_actions for delete
  using (
    is_admin_or_dc()
    or exists (
      select 1 from sop_versions v
      where v.id = approval_actions.sop_version_id and v.author_id = auth.uid()
    )
  );

create policy "socialization_delete_with_version_owner_or_admin"
  on socialization_records for delete
  using (
    is_admin_or_dc()
    or exists (
      select 1 from sop_versions v
      where v.id = socialization_records.sop_version_id and v.author_id = auth.uid()
    )
  );

create policy "quiz_attempts_delete_with_version_owner_or_admin"
  on quiz_attempts for delete
  using (
    is_admin_or_dc()
    or exists (
      select 1 from socialization_records sr
      join sop_versions v on v.id = sr.sop_version_id
      where sr.id = quiz_attempts.socialization_record_id and v.author_id = auth.uid()
    )
  );

-- Note: quiz_questions already has a "for all" policy
-- (quiz_questions_write_admin_or_author from 001), which already covers
-- delete — no new policy needed there.