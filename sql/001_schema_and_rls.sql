-- =========================================================
-- SOP Management App — Database Schema (Postgres / Supabase)
-- =========================================================
-- Catatan umum:
-- - Semua primary key pakai UUID (default gen_random_uuid()).
-- - Kolom status pakai TEXT + CHECK constraint (biar gampang dibaca,
--   bisa diganti ke ENUM kalau mau lebih strict).
-- - RLS (Row Level Security) baru diaktifkan setelah struktur ini
--   stabil — lihat catatan di bagian bawah.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. DEPARTMENTS
-- ---------------------------------------------------------
create table departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 2. USERS
-- Catatan: kalau pakai Supabase Auth, tabel ini biasanya
-- extend dari auth.users (id yang sama), bukan tabel independen.
-- ---------------------------------------------------------
create table users (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text not null unique,
  department_id  uuid references departments(id),
  role           text not null check (role in ('staff', 'document_controller', 'admin')),
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 3. SOP_CATEGORIES
-- Dikelola oleh Document Controller. Menentukan siapa
-- reviewer & approver default untuk kategori ini.
-- ---------------------------------------------------------
create table sop_categories (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  department_id         uuid references departments(id),
  default_reviewer_id   uuid references users(id),
  default_approver_id   uuid references users(id),
  created_at            timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 4. SOPS
-- Representasi "payung" satu SOP. Isinya di sop_versions.
-- current_version_id nunjuk ke versi yang lagi aktif.
-- ---------------------------------------------------------
create table sops (
  id                   uuid primary key default gen_random_uuid(),
  category_id          uuid not null references sop_categories(id),
  title                text not null,
  document_number      text not null unique,  -- mis. "SOP-QA-002"
  keywords             text[],                 -- untuk pencarian/header
  status               text not null default 'draft'
                         check (status in ('draft', 'in_review', 'in_approval',
                                            'published', 'expired', 'superseded')),
  current_version_id  uuid,  -- FK ditambahkan lewat ALTER setelah sop_versions ada
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 5. SOP_VERSIONS
-- Satu baris = satu versi/revisi dari sebuah SOP.
-- previous_version_id bikin rantai histori revisi.
-- ---------------------------------------------------------
create table sop_versions (
  id                   uuid primary key default gen_random_uuid(),
  sop_id               uuid not null references sops(id),
  version_number       integer not null,
  -- content mengikuti template SOP standar (purpose, scope, references,
  -- definitions, roles_responsibilities, procedure, appendices).
  -- Revision history & approval signatures TIDAK disimpan di sini —
  -- itu di-derive dari sop_versions chain + approval_actions.
  -- Contoh struktur lengkap ada di komentar bawah file ini.
  content              jsonb not null,
  status               text not null default 'draft'
                         check (status in ('draft', 'in_review', 'revision_requested',
                                            'in_approval', 'published', 'rejected', 'superseded')),
  previous_version_id  uuid references sop_versions(id),
  author_id            uuid not null references users(id),
  reviewer_id          uuid references users(id),
  approver_id          uuid references users(id),
  reviewed_at          timestamptz,
  approved_at          timestamptz,
  published_at         timestamptz,
  valid_until          date,  -- masa berlaku (mis. published_at + 2/3 tahun)
  created_at           timestamptz not null default now(),
  unique (sop_id, version_number)
);

alter table sops
  add constraint fk_sops_current_version
  foreign key (current_version_id) references sop_versions(id);

-- ---------------------------------------------------------
-- 6. APPROVAL_ACTIONS
-- Log setiap tindakan di alur review/approval — buat audit trail.
-- ---------------------------------------------------------
create table approval_actions (
  id               uuid primary key default gen_random_uuid(),
  sop_version_id   uuid not null references sop_versions(id),
  actor_id         uuid not null references users(id),
  action           text not null
                     check (action in ('submitted', 'review_approved', 'revision_requested',
                                        'approved', 'rejected', 'published')),
  comment          text,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 7. SOCIALIZATION_RECORDS
-- Satu baris per (SOP version, user) yang wajib sosialisasi.
-- ---------------------------------------------------------
create table socialization_records (
  id               uuid primary key default gen_random_uuid(),
  sop_version_id   uuid not null references sop_versions(id),
  user_id          uuid not null references users(id),
  notified_at      timestamptz,
  completed_at     timestamptz,
  passed           boolean not null default false,
  attempt_count    integer not null default 0,
  created_at       timestamptz not null default now(),
  unique (sop_version_id, user_id)
);

-- ---------------------------------------------------------
-- 8. QUIZ_QUESTIONS
-- ~3 soal pemahaman per SOP version.
-- ---------------------------------------------------------
create table quiz_questions (
  id               uuid primary key default gen_random_uuid(),
  sop_version_id   uuid not null references sop_versions(id),
  question_text    text not null,
  options          jsonb not null,      -- contoh: ["A. ...", "B. ...", "C. ..."]
  correct_option   integer not null,    -- index jawaban benar di array options
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 9. QUIZ_ATTEMPTS
-- Histori tiap kali user coba kuis (bisa lebih dari 1 kali
-- kalau nilai di bawah passing grade).
-- ---------------------------------------------------------
create table quiz_attempts (
  id                         uuid primary key default gen_random_uuid(),
  socialization_record_id    uuid not null references socialization_records(id),
  score                      integer not null,     -- misal 0-100
  passed                     boolean not null,
  attempted_at               timestamptz not null default now()
);

-- =========================================================
-- Index tambahan yang penting untuk performa query umum
-- =========================================================
create index idx_sop_versions_sop_id on sop_versions(sop_id);
create index idx_sop_versions_status on sop_versions(status);
create index idx_sop_versions_valid_until on sop_versions(valid_until);
create index idx_approval_actions_version on approval_actions(sop_version_id);
create index idx_socialization_user on socialization_records(user_id);
create index idx_socialization_version on socialization_records(sop_version_id);

-- =========================================================
-- Catatan lanjutan
-- =========================================================
-- 1. RLS (Row Level Security):
--    - users: user cuma bisa baca data user lain di departemen yang sama
--      (kecuali document_controller/admin yang bisa lihat semua).
--    - sop_versions: akses baca terbuka untuk yang published, tapi draft
--      hanya untuk author/reviewer/approver terkait.
--    - socialization_records & quiz_attempts: user cuma bisa lihat/insert
--      punya sendiri.
--
-- 2. Trigger yang berguna untuk dibuat kemudian:
--    - Saat sop_versions.status berubah jadi 'published':
--        a. update sops.current_version_id & sops.status
--        b. set previous_version_id punya status 'superseded'
--        c. auto-generate baris socialization_records untuk semua user
--           di departemen terkait
--    - Saat valid_until mendekati (misal H-30): kirim notifikasi reminder
--      (bisa lewat scheduled function / cron job di Supabase Edge Functions)
--
-- 3. version_number bisa dihitung otomatis lewat trigger
--    (max(version_number) di sop_id yang sama + 1), biar tidak perlu
--    di-set manual dari aplikasi.
--
-- 4. Contoh struktur sop_versions.content (mengikuti template SOP standar):
--    {
--      "purpose": "Menjelaskan tata cara ...",
--      "scope": {
--        "applies_to": "Semua staf QA di pabrik X",
--        "excludes": "Tidak berlaku untuk proses Y"
--      },
--      "references": [
--        {"title": "SOP-QA-002 Kalibrasi Alat", "doc_number": "SOP-QA-002"}
--      ],
--      "definitions": [
--        {"term": "CAPA", "definition": "Corrective and Preventive Action"}
--      ],
--      "roles_responsibilities": [
--        {"role": "QA Officer", "responsibility": "Melakukan pengecekan harian"}
--      ],
--      "procedure": [
--        {
--          "major_step": "Persiapan alat",
--          "actions": ["Cek kalibrasi alat", "Siapkan APD"],
--          "notes": ["Pastikan alat sudah dikalibrasi dalam 30 hari terakhir"]
--        }
--      ],
--      "appendices": [
--        {"type": "flowchart", "description": "Diagram alur inspeksi", "file_url": "..."}
--      ]
--    }
--
--    Optional: tambahkan CHECK constraint sederhana untuk memastikan
--    key wajib selalu ada, misalnya:
--    alter table sop_versions add constraint content_has_required_keys
--      check (content ?& array['purpose', 'scope', 'procedure']);

-- =========================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================
-- Asumsi: users.id SAMA dengan auth.uid() dari Supabase Auth.
-- Kalau belum, sesuaikan dulu:
--   alter table users add constraint users_id_matches_auth
--     foreign key (id) references auth.users(id);
-- dan pastikan proses signup selalu insert ke `users` pakai id dari auth.uid().

-- ---------------------------------------------------------
-- Helper functions (dipakai berulang di banyak policy)
-- ---------------------------------------------------------
create or replace function is_admin_or_dc()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from users
    where id = auth.uid()
      and role in ('document_controller', 'admin')
  );
$$;

create or replace function current_department_id()
returns uuid
language sql
security definer
stable
as $$
  select department_id from users where id = auth.uid();
$$;

-- ---------------------------------------------------------
-- DEPARTMENTS
-- ---------------------------------------------------------
alter table departments enable row level security;

create policy "departments_select_all"
  on departments for select
  using (true);  -- semua user login boleh lihat daftar departemen

create policy "departments_write_admin_only"
  on departments for all
  using (is_admin_or_dc())
  with check (is_admin_or_dc());

-- ---------------------------------------------------------
-- USERS
-- ---------------------------------------------------------
alter table users enable row level security;

create policy "users_select_own_or_admin"
  on users for select
  using (id = auth.uid() or is_admin_or_dc());

create policy "users_update_own_limited"
  on users for update
  using (id = auth.uid() or is_admin_or_dc())
  with check (id = auth.uid() or is_admin_or_dc());
  -- Catatan: kolom `role` sebaiknya tidak diubah user sendiri —
  -- proteksi ini idealnya lewat trigger `before update` yang menolak
  -- perubahan kolom `role` kalau bukan admin/document_controller.

-- ---------------------------------------------------------
-- SOP_CATEGORIES
-- ---------------------------------------------------------
alter table sop_categories enable row level security;

create policy "categories_select_all"
  on sop_categories for select
  using (true);

create policy "categories_write_admin_only"
  on sop_categories for all
  using (is_admin_or_dc())
  with check (is_admin_or_dc());

-- ---------------------------------------------------------
-- SOPS
-- ---------------------------------------------------------
alter table sops enable row level security;

create policy "sops_select_published_to_all"
  on sops for select
  using (
    status = 'published'
    or is_admin_or_dc()
  );

create policy "sops_select_draft_to_stakeholders"
  on sops for select
  using (
    status <> 'published'
    and exists (
      select 1 from sop_versions v
      where v.sop_id = sops.id
        and (v.author_id = auth.uid() or v.reviewer_id = auth.uid() or v.approver_id = auth.uid())
    )
  );

create policy "sops_insert_staff"
  on sops for insert
  with check (auth.uid() is not null);  -- siapa saja yang login (author) boleh mulai SOP baru

create policy "sops_update_stakeholders_or_admin"
  on sops for update
  using (
    is_admin_or_dc()
    or exists (
      select 1 from sop_versions v
      where v.sop_id = sops.id
        and (v.author_id = auth.uid() or v.reviewer_id = auth.uid() or v.approver_id = auth.uid())
    )
  );

-- ---------------------------------------------------------
-- SOP_VERSIONS
-- ---------------------------------------------------------
alter table sop_versions enable row level security;

create policy "versions_select_published_to_all"
  on sop_versions for select
  using (status = 'published' or is_admin_or_dc());

create policy "versions_select_draft_to_stakeholders"
  on sop_versions for select
  using (
    status <> 'published'
    and (author_id = auth.uid() or reviewer_id = auth.uid() or approver_id = auth.uid())
  );

create policy "versions_insert_own_as_author"
  on sop_versions for insert
  with check (author_id = auth.uid() or is_admin_or_dc());

create policy "versions_update_stakeholders"
  on sop_versions for update
  using (
    is_admin_or_dc()
    or author_id = auth.uid()
    or reviewer_id = auth.uid()
    or approver_id = auth.uid()
  );

-- ---------------------------------------------------------
-- APPROVAL_ACTIONS
-- ---------------------------------------------------------
alter table approval_actions enable row level security;

create policy "approval_actions_select_stakeholders"
  on approval_actions for select
  using (
    is_admin_or_dc()
    or exists (
      select 1 from sop_versions v
      where v.id = approval_actions.sop_version_id
        and (v.author_id = auth.uid() or v.reviewer_id = auth.uid() or v.approver_id = auth.uid())
    )
  );

create policy "approval_actions_insert_actor_only"
  on approval_actions for insert
  with check (
    actor_id = auth.uid()
    and exists (
      select 1 from sop_versions v
      where v.id = sop_version_id
        and (v.reviewer_id = auth.uid() or v.approver_id = auth.uid() or v.author_id = auth.uid())
    )
  );

-- ---------------------------------------------------------
-- SOCIALIZATION_RECORDS
-- ---------------------------------------------------------
alter table socialization_records enable row level security;

create policy "socialization_select_own_or_admin"
  on socialization_records for select
  using (user_id = auth.uid() or is_admin_or_dc());

create policy "socialization_update_own"
  on socialization_records for update
  using (user_id = auth.uid() or is_admin_or_dc());

create policy "socialization_insert_admin_only"
  on socialization_records for insert
  with check (is_admin_or_dc());
  -- baris ini idealnya di-generate otomatis lewat trigger saat SOP
  -- published (lihat catatan trigger di atas), bukan diinsert manual
  -- dari client.

-- ---------------------------------------------------------
-- QUIZ_QUESTIONS
-- ---------------------------------------------------------
alter table quiz_questions enable row level security;

create policy "quiz_questions_select_if_has_record"
  on quiz_questions for select
  using (
    is_admin_or_dc()
    or exists (
      select 1 from socialization_records sr
      where sr.sop_version_id = quiz_questions.sop_version_id
        and sr.user_id = auth.uid()
    )
  );

create policy "quiz_questions_write_admin_or_author"
  on quiz_questions for all
  using (
    is_admin_or_dc()
    or exists (
      select 1 from sop_versions v
      where v.id = quiz_questions.sop_version_id and v.author_id = auth.uid()
    )
  );

-- ---------------------------------------------------------
-- QUIZ_ATTEMPTS
-- ---------------------------------------------------------
alter table quiz_attempts enable row level security;

create policy "quiz_attempts_select_own_or_admin"
  on quiz_attempts for select
  using (
    is_admin_or_dc()
    or exists (
      select 1 from socialization_records sr
      where sr.id = quiz_attempts.socialization_record_id and sr.user_id = auth.uid()
    )
  );

create policy "quiz_attempts_insert_own"
  on quiz_attempts for insert
  with check (
    exists (
      select 1 from socialization_records sr
      where sr.id = socialization_record_id and sr.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------
-- TRIGGER: cegah user mengubah kolom `role`/`department_id`
-- miliknya sendiri (mencegah self-escalation ke admin/document_controller)
-- ---------------------------------------------------------
create or replace function prevent_self_role_change()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Kalau yang jalankan update ini admin/document_controller, izinkan apa saja.
  if is_admin_or_dc() then
    return new;
  end if;

  -- Selain admin/document_controller: role dan department_id tidak boleh berubah,
  -- walau dia update baris miliknya sendiri (mis. ganti nama/email).
  if new.role is distinct from old.role then
    raise exception 'Tidak diizinkan mengubah role sendiri';
  end if;

  if new.department_id is distinct from old.department_id then
    raise exception 'Tidak diizinkan mengubah department_id sendiri';
  end if;

  return new;
end;
$$;

create trigger trg_prevent_self_role_change
  before update on users
  for each row
  execute function prevent_self_role_change();
