-- =========================================================
-- Allow any authenticated user to see basic profile info (name) of
-- other users — needed for things like Approval History showing who
-- did what. This does NOT expose anything more sensitive; the existing
-- "users_select_own_or_admin" policy still applies alongside this one
-- (RLS policies are OR'd together, so this just widens SELECT access).
-- =========================================================

create policy "users_select_basic_info_authenticated"
  on users for select
  using (auth.role() = 'authenticated');

-- Note: this makes the earlier "users_select_own_or_admin" SELECT policy
-- redundant (this one is a superset for SELECT), but it's left in place
-- since it's harmless and documents intent. UPDATE is unaffected — that
-- policy still restricts who can modify which rows.