-- =========================================================
-- Seed data untuk development/testing
-- =========================================================
-- Jalankan ini SETELAH ada minimal 2-3 user yang signup lewat app
-- (supaya ada auth.users yang bisa dijadikan reviewer_id/approver_id).
--
-- Cara pakai:
-- 1. Signup 2-3 akun dulu lewat halaman /signup (misal: qa.manager@test.com,
--    hseq.manager@test.com, staff@test.com)
-- 2. Cek id mereka: select id, email from users;
-- 3. Ganti placeholder di bawah dengan id asli, lalu jalankan file ini.

-- ---------------------------------------------------------
-- 1. Departments
-- ---------------------------------------------------------
insert into departments (name) values
  ('Quality Assurance'),
  ('HSEQ'),
  ('Produksi')
on conflict (name) do nothing;

-- ---------------------------------------------------------
-- 2. Promote user tertentu jadi document_controller (ganti email-nya)
-- ---------------------------------------------------------
update users set role = 'document_controller'
  where email = 'muhammadqaliyyanwijaya@gmail.com';

-- ---------------------------------------------------------
-- 3. SOP Categories + mapping reviewer/approver default
-- ---------------------------------------------------------
-- Ganti 'GANTI_DENGAN_ID_...' dengan id user asli hasil query di atas.

insert into sop_categories (name, department_id, default_reviewer_id, default_approver_id)
values (
  'Quality Control',
  (select id from departments where name = 'Quality Assurance'),
  '7583c3a7-3003-4d8d-9dac-35bd4296d1fb',
  '98d5f0bf-05ea-44ec-8d6a-4e7cb5277e66'
);

insert into sop_categories (name, department_id, default_reviewer_id, default_approver_id)
values (
  'Keselamatan Kerja',
  (select id from departments where name = 'HSEQ'),
  '7583c3a7-3003-4d8d-9dac-35bd4296d1fb',
  '98d5f0bf-05ea-44ec-8d6a-4e7cb5277e66'
);
