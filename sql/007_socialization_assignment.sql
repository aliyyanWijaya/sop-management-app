-- Tambah kolom deadline
alter table socialization_records
  add column if not exists due_at timestamptz;

-- Author dari versi SOP yang bersangkutan sekarang juga boleh insert
-- socialization_records (sebelumnya cuma admin/DC atau approver) —
-- karena sekarang authorlah yang pilih penerimanya, bukan otomatis
-- saat publish.
create policy "socialization_insert_by_author"
  on socialization_records for insert
  with check (
    exists (
      select 1 from sop_versions v
      where v.id = socialization_records.sop_version_id
        and v.author_id = auth.uid()
    )
  );

-- Supaya author bisa lihat progress siapa yang sudah/belum selesai
-- (sebelumnya cuma admin/DC atau si user sendiri yang bisa lihat).
create policy "socialization_select_by_author"
  on socialization_records for select
  using (
    exists (
      select 1 from sop_versions v
      where v.id = socialization_records.sop_version_id
        and v.author_id = auth.uid()
    )
  );