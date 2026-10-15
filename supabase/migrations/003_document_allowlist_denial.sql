-- The allowlist is intentionally server-only. This explicit deny policy documents
-- the choice and keeps security tooling from treating the table as forgotten.
drop policy if exists "deny client access to allowlist" on public.allowed_users;
create policy "deny client access to allowlist"
on public.allowed_users
for all
to authenticated
using (false)
with check (false);
