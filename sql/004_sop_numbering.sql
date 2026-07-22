-- =========================================================
-- SOP document numbering: per-department, reserved & sequential
-- =========================================================
-- Jalankan setelah 001, 002, 003.

-- ---------------------------------------------------------
-- 1. Tambah kode singkat per departemen (dipakai di nomor dokumen)
-- ---------------------------------------------------------
alter table departments
  add column if not exists code text unique;

-- Isi kode untuk departemen yang sudah ada dari seed data kemarin.
-- Sesuaikan kalau nama departemen kamu beda.
update departments set code = 'QA'   where name = 'Quality Assurance' and code is null;
update departments set code = 'HSEQ' where name = 'HSEQ' and code is null;
update departments set code = 'PROD' where name = 'Produksi' and code is null;

-- Kalau masih ada departemen tanpa code, migration ini akan gagal di
-- constraint berikutnya — isi manual dulu:
--   update departments set code = 'XXX' where id = '...';

alter table departments
  alter column code set not null;

-- ---------------------------------------------------------
-- 2. Counter nomor per departemen — "reserved" artinya nomor yang
-- sudah diambil TIDAK BISA diambil lagi oleh orang lain, walau 2 orang
-- submit di detik yang sama (dijamin atomic oleh row lock di UPDATE).
-- ---------------------------------------------------------
create table if not exists department_sop_counters (
  department_id  uuid primary key references departments(id),
  last_number    integer not null default 0
);

insert into department_sop_counters (department_id, last_number)
select id, 0 from departments
on conflict (department_id) do nothing;

-- RLS enabled dengan SENGAJA TANPA policy apapun — artinya tabel ini
-- tidak bisa diakses/diubah langsung lewat Supabase client (REST/JS),
-- cuma bisa lewat function di bawah (security definer, dijalankan
-- sebagai owner yang bypass RLS). Ini mencegah user iseng nge-set
-- last_number sendiri lewat client.
alter table department_sop_counters enable row level security;

-- ---------------------------------------------------------
-- 3. Function: reserve nomor urut berikutnya untuk 1 departemen
-- ---------------------------------------------------------
create or replace function reserve_next_sop_number(p_department_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  next_number integer;
begin
  -- UPDATE ... RETURNING mengunci baris ini sampai transaksi selesai,
  -- jadi 2 request bersamaan otomatis antre — tidak akan pernah dapat
  -- nomor yang sama.
  update department_sop_counters
  set last_number = last_number + 1
  where department_id = p_department_id
  returning last_number into next_number;

  if next_number is null then
    raise exception 'Departemen % belum punya counter nomor SOP', p_department_id;
  end if;

  return next_number;
end;
$$;

-- ---------------------------------------------------------
-- 4. Function: generate nomor dokumen lengkap, format SOP-{CODE}-{0001}
-- ---------------------------------------------------------
create or replace function generate_sop_document_number(p_category_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_department_id uuid;
  v_department_code text;
  v_next_number integer;
begin
  select c.department_id, d.code
  into v_department_id, v_department_code
  from sop_categories c
  join departments d on d.id = c.department_id
  where c.id = p_category_id;

  if v_department_code is null then
    raise exception 'Kategori atau departemen tidak ditemukan untuk category_id %', p_category_id;
  end if;

  v_next_number := reserve_next_sop_number(v_department_id);

  return 'SOP-' || v_department_code || '-' || lpad(v_next_number::text, 4, '0');
end;
$$;

-- Izinkan dipanggil lewat RPC oleh user login (security definer di atas
-- yang menjamin akses ke tabel counter, bukan RLS langsung).
grant execute on function generate_sop_document_number(uuid) to authenticated;