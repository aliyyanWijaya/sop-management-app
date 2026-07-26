-- =========================================================
-- Fix: clear OLD departments (e.g. 'Quality Assurance' / 'HSEQ' /
-- 'Produksi' from the original sql-003/sql-004 seed) that conflict on
-- the `code` unique constraint with the new Tasman BioChem departments
-- ('Quality' / 'Operations' / 'HR' / 'Sales & Marketing').
--
-- Run this ONCE, then re-run sql-008_full_seed_tasman_biochem.sql from
-- the top. Safe even if sql-009 (reset) was already run — the deletes
-- below are all "delete if any rows match", no-ops if already empty.
-- =========================================================

-- 1. Detach every foreign key that points at departments.id, in the
--    order required by the FK constraints (children before parents).
--
-- Note: trg_prevent_self_role_change (sql-001) guards department_id
-- changes via is_admin_or_dc(), which checks auth.uid() — and the SQL
-- Editor doesn't run inside a real Supabase Auth session, so auth.uid()
-- is NULL there and the check always fails, blocking this update. We
-- disable the trigger just for this one statement, then re-enable it
-- immediately — this is a one-off admin cleanup, not a normal app flow.
alter table users disable trigger trg_prevent_self_role_change;
update users set department_id = null;
alter table users enable trigger trg_prevent_self_role_change;

delete from sop_categories;              -- references departments.id
delete from department_sop_counters;     -- references departments.id (PK, no cascade)

-- 2. Now safe to remove every existing department row, regardless of
--    what it was called before.
delete from departments;

-- =========================================================
-- After this runs cleanly, re-run sql-008_full_seed_tasman_biochem.sql
-- from the top. Its department INSERT will now succeed with no
-- leftover 'QA'/'OPS'/'HR'/'SM' codes to collide with.
--
-- One more thing sql-008 assumes but doesn't create itself: a
-- department_sop_counters row per department (originally created by
-- sql-004's insert-select against the OLD departments, which we just
-- deleted). Run this right after sql-008's department INSERT step
-- (or any time before creating a new SOP through the app UI):
--
--   insert into department_sop_counters (department_id, last_number)
--     select id, 0 from departments
--     on conflict (department_id) do nothing;
--
-- Without this, sql-008's "update department_sop_counters set
-- last_number = ..." lines silently affect 0 rows (not an error, since
-- our seeded SOPs get their document_number hard-inserted, not via
-- reserve_next_sop_number) — but the very next SOP someone tries to
-- create through /sop/new will fail with "Departemen % belum punya
-- counter nomor SOP" until this insert has been run.
-- =========================================================
