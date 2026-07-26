-- =========================================================
-- Reset SOP application data before re-seeding.
-- Safe to run multiple times. Does NOT touch auth.users / public.users
-- — your 13 signed-up accounts stay intact, so you don't need to
-- sign up again. Only run the "wipe auth users too" section at the
-- bottom if you genuinely want a fully blank slate.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Wipe everything downstream of sops/sop_categories.
-- TRUNCATE ... CASCADE follows the foreign-key graph regardless of
-- each table's own ON DELETE rule, so listing the "top" tables here
-- is enough — sop_versions, approval_actions, socialization_records,
-- quiz_questions, quiz_attempts, and sop_content_chunks all get
-- cleared automatically as dependents.
-- ---------------------------------------------------------
truncate table
  sops,
  sop_categories
cascade;

-- ---------------------------------------------------------
-- 2. Reset the per-department SOP numbering counters back to zero,
-- so freshly re-seeded SOPs start at 0001 again (and so any NEW SOP
-- created afterwards through the app doesn't clash with the seed).
-- ---------------------------------------------------------
update department_sop_counters set last_number = 0;

-- ---------------------------------------------------------
-- 3. departments itself is left alone — sql-008's department insert
-- uses "on conflict (name) do update", so it's safe to re-run without
-- truncating this table. If you genuinely want to remove departments
-- too (e.g. renaming the whole dummy company), uncomment:
-- ---------------------------------------------------------
-- truncate table departments cascade;
-- insert into department_sop_counters (department_id, last_number)
--   select id, 0 from departments on conflict (department_id) do nothing;

-- =========================================================
-- After running this, just re-run sql-008_full_seed_tasman_biochem.sql
-- from the top — it will recreate all 19 SOPs, categories, quiz
-- questions, socialization records, and AI-assistant chunks cleanly.
-- =========================================================


-- =========================================================
-- OPTIONAL — only if you want a fully blank slate including the
-- login accounts themselves (e.g. starting over with different
-- names/emails entirely):
--
-- auth.users CANNOT be deleted with a plain "delete from auth.users"
-- from the SQL editor in most Supabase setups (Auth manages it
-- separately from plain Postgres access). Use one of these instead:
--
--   Option A — Supabase Dashboard:
--     Authentication -> Users -> select each user -> Delete user.
--     This cascades to public.users automatically (see the
--     "users_id_matches_auth" foreign key with ON DELETE CASCADE
--     added in sql-002_auth_trigger.sql), so you don't need to
--     delete public.users separately.
--
--   Option B — Admin API (from a trusted server context only, using
--   the SERVICE ROLE key, never the anon key):
--     await supabase.auth.admin.deleteUser(userId)
--
-- After deleting the auth accounts, sign up the 13 dummy emails again
-- via /signup, then re-run sql-008 from the top.
-- =========================================================
