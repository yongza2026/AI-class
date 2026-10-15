-- RLS policies call these helpers as the authenticated user.
-- Allow only schema lookup and execution of the three boolean checks.
grant usage on schema private to authenticated;

grant execute on function private.is_store_member(uuid) to authenticated;
grant execute on function private.can_edit_store(uuid) to authenticated;
grant execute on function private.is_store_owner(uuid) to authenticated;
