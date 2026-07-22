-- =========================================================
-- pgTAP tests untuk RLS policies
-- Jalankan dengan: supabase test db
-- (butuh Supabase CLI, dan extension pgtap sudah aktif secara
-- default di local dev environment Supabase)
-- =========================================================

begin;
select plan(10);

-- ---------------------------------------------------------
-- Setup data dasar sebagai superuser/service role (bypass RLS)
-- ---------------------------------------------------------
insert into departments (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'QA Test');

-- Tiga "user" auth palsu. Di test asli, baris ini biasanya sudah
-- otomatis ada dari auth.users lewat trigger on_auth_user_created;
-- di sini kita insert langsung ke public.users untuk kesederhanaan test.
insert into users (id, name, email, department_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Author', 'author@test.com', '11111111-1111-1111-1111-111111111111', 'staff'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Reviewer', 'reviewer@test.com', '11111111-1111-1111-1111-111111111111', 'staff'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Outsider', 'outsider@test.com', '11111111-1111-1111-1111-111111111111', 'staff'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'DocController', 'dc@test.com', '11111111-1111-1111-1111-111111111111', 'document_controller');

insert into sop_categories (id, name, department_id, default_reviewer_id, default_approver_id) values
  ('22222222-2222-2222-2222-222222222222', 'Kategori Test', '11111111-1111-1111-1111-111111111111',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

insert into sops (id, category_id, title, document_number, status) values
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'SOP Draft Test', 'SOP-TEST-001', 'draft');

insert into sop_versions (id, sop_id, version_number, content, status, author_id, reviewer_id) values
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 1,
   '{"purpose": "test", "scope": {}, "procedure": []}'::jsonb, 'draft',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- ---------------------------------------------------------
-- Test 1: Author bisa lihat draft SOP version miliknya sendiri
-- ---------------------------------------------------------
set local role authenticated;
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select is(
  (select count(*)::int from sop_versions where id = '44444444-4444-4444-4444-444444444444'),
  1,
  'Author bisa melihat draft SOP version miliknya sendiri'
);

-- ---------------------------------------------------------
-- Test 2: Reviewer yang ditugaskan bisa lihat draft yang sama
-- ---------------------------------------------------------
set local "request.jwt.claim.sub" = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

select is(
  (select count(*)::int from sop_versions where id = '44444444-4444-4444-4444-444444444444'),
  1,
  'Reviewer yang ditugaskan bisa melihat draft SOP version tersebut'
);

-- ---------------------------------------------------------
-- Test 3: Outsider (bukan author/reviewer/approver) TIDAK bisa lihat draft
-- ---------------------------------------------------------
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

select is(
  (select count(*)::int from sop_versions where id = '44444444-4444-4444-4444-444444444444'),
  0,
  'Outsider tidak bisa melihat draft SOP version yang bukan tanggung jawabnya'
);

-- ---------------------------------------------------------
-- Test 4: Document Controller bisa lihat draft siapapun
-- ---------------------------------------------------------
set local "request.jwt.claim.sub" = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

select is(
  (select count(*)::int from sop_versions where id = '44444444-4444-4444-4444-444444444444'),
  1,
  'Document Controller bisa melihat draft SOP version siapapun'
);

-- ---------------------------------------------------------
-- Test 5 & 6: Outsider TIDAK bisa insert approval_actions untuk
-- versi yang bukan tanggung jawabnya
-- ---------------------------------------------------------
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

select throws_ok(
  $$ insert into approval_actions (sop_version_id, actor_id, action)
     values ('44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'submitted') $$,
  'new row violates row-level security policy for table "approval_actions"',
  'Outsider tidak bisa insert approval_actions untuk versi yang bukan tanggung jawabnya'
);

-- ---------------------------------------------------------
-- Test 7: Reviewer YANG ditugaskan BISA insert approval_actions
-- ---------------------------------------------------------
set local "request.jwt.claim.sub" = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

select lives_ok(
  $$ insert into approval_actions (sop_version_id, actor_id, action)
     values ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'review_approved') $$,
  'Reviewer yang ditugaskan bisa insert approval_actions untuk versi tersebut'
);

-- ---------------------------------------------------------
-- Test 8: User biasa TIDAK bisa ubah role dirinya sendiri
-- ---------------------------------------------------------
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select throws_ok(
  $$ update users set role = 'admin' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'Tidak diizinkan mengubah role sendiri',
  'User biasa tidak bisa menaikkan role dirinya sendiri jadi admin'
);

-- ---------------------------------------------------------
-- Test 9: Document Controller BOLEH ubah role user lain
-- ---------------------------------------------------------
set local "request.jwt.claim.sub" = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

select lives_ok(
  $$ update users set role = 'admin' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'Document Controller boleh mengubah role user lain'
);

-- ---------------------------------------------------------
-- Test 10: Published SOP version bisa dilihat semua orang (termasu outsider)
-- ---------------------------------------------------------
reset role;
update sop_versions set status = 'published' where id = '44444444-4444-4444-4444-444444444444';

set local role authenticated;
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

select is(
  (select count(*)::int from sop_versions where id = '44444444-4444-4444-4444-444444444444'),
  1,
  'SOP version yang sudah published bisa dilihat semua orang, termasuk outsider'
);

select * from finish();
rollback;
