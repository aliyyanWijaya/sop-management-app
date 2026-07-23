-- =========================================================
-- Allow the approver of a SOP version to insert socialization_records
-- for it (not just Document Controller/Admin) — needed because the
-- approve-and-publish action generates these records automatically,
-- and the approver isn't necessarily a Document Controller.
-- =========================================================

create policy "socialization_insert_by_approver"
  on socialization_records for insert
  with check (
    exists (
      select 1 from sop_versions v
      where v.id = socialization_records.sop_version_id
        and v.approver_id = auth.uid()
    )
  );