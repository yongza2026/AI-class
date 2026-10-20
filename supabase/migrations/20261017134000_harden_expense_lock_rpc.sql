create policy "deny direct expense lock access" on private.expense_locks
for all to authenticated using (false) with check (false);

create index expense_locks_updated_by_idx on private.expense_locks(updated_by);

alter function public.expense_lock_status() rename to expense_lock_status_impl_pending;
alter function public.set_expense_lock_password(text, text) rename to set_expense_lock_password_impl_pending;
alter function public.verify_expense_lock_password(text) rename to verify_expense_lock_password_impl_pending;

alter function public.expense_lock_status_impl_pending() set schema private;
alter function public.set_expense_lock_password_impl_pending(text, text) set schema private;
alter function public.verify_expense_lock_password_impl_pending(text) set schema private;

alter function private.expense_lock_status_impl_pending() rename to expense_lock_status_impl;
alter function private.set_expense_lock_password_impl_pending(text, text) rename to set_expense_lock_password_impl;
alter function private.verify_expense_lock_password_impl_pending(text) rename to verify_expense_lock_password_impl;

create function public.expense_lock_status()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.expense_lock_status_impl()
$$;

create function public.set_expense_lock_password(p_password text, p_current_password text default null)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_expense_lock_password_impl(p_password, p_current_password)
$$;

create function public.verify_expense_lock_password(p_password text)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.verify_expense_lock_password_impl(p_password)
$$;

revoke execute on function private.expense_lock_status_impl() from public, anon, service_role;
revoke execute on function private.set_expense_lock_password_impl(text, text) from public, anon, service_role;
revoke execute on function private.verify_expense_lock_password_impl(text) from public, anon, service_role;
grant execute on function private.expense_lock_status_impl() to authenticated;
grant execute on function private.set_expense_lock_password_impl(text, text) to authenticated;
grant execute on function private.verify_expense_lock_password_impl(text) to authenticated;

revoke execute on function public.expense_lock_status() from public, anon;
revoke execute on function public.set_expense_lock_password(text, text) from public, anon;
revoke execute on function public.verify_expense_lock_password(text) from public, anon;
grant execute on function public.expense_lock_status() to authenticated;
grant execute on function public.set_expense_lock_password(text, text) to authenticated;
grant execute on function public.verify_expense_lock_password(text) to authenticated;
