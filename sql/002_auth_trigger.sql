-- =========================================================
-- Trigger: auto-create baris di public.users saat ada signup baru
-- lewat Supabase Auth (auth.users)
-- =========================================================
-- Catatan: jalankan ini SETELAH sop-app-schema.sql (tabel users
-- harus sudah ada).
--
-- Perubahan pada tabel users: id sekarang harus SAMA dengan
-- auth.users.id, bukan uuid random sendiri. Primary key di kolom id
-- tetap ada — kita cuma hapus default random-nya dan tambah FK ke
-- auth.users supaya insert wajib pakai id yang sudah ada di auth.

alter table users
  alter column id drop default;

alter table users
  add constraint users_id_matches_auth
  foreign key (id) references auth.users(id) on delete cascade;

-- role default untuk user baru: 'staff'. Admin/document_controller
-- harus di-promote manual lewat dashboard Supabase atau SQL langsung,
-- tidak bisa dipilih sendiri saat signup (lihat trigger
-- prevent_self_role_change yang mencegah self-escalation).

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, department_id, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data->>'department_id', '')::uuid,
    'staff'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_auth_user();
