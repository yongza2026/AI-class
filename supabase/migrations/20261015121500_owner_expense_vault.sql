create table private.expense_locks (
  store_id uuid primary key references public.stores(id) on delete cascade,
  password_hash text not null,
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 5),
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id)
);

alter table private.expense_locks enable row level security;
revoke all on private.expense_locks from public, anon, authenticated, service_role;

drop policy "members read records" on public.store_records;
drop policy "editors insert records" on public.store_records;
drop policy "editors update records" on public.store_records;
drop policy "editors delete records" on public.store_records;

create policy "members read records" on public.store_records
for select to authenticated using (
  (select private.is_store_member(store_id))
  and (
    collection not in ('expenses', 'monthlyExpensePlan')
    or (select private.is_store_owner(store_id))
  )
);

create policy "editors insert records" on public.store_records
for insert to authenticated with check (
  (select private.can_edit_store(store_id))
  and (
    collection not in ('expenses', 'monthlyExpensePlan')
    or (select private.is_store_owner(store_id))
  )
);

create policy "editors update records" on public.store_records
for update to authenticated using (
  (select private.can_edit_store(store_id))
  and (
    collection not in ('expenses', 'monthlyExpensePlan')
    or (select private.is_store_owner(store_id))
  )
) with check (
  (select private.can_edit_store(store_id))
  and (
    collection not in ('expenses', 'monthlyExpensePlan')
    or (select private.is_store_owner(store_id))
  )
);

create policy "editors delete records" on public.store_records
for delete to authenticated using (
  (select private.can_edit_store(store_id))
  and (
    collection not in ('expenses', 'monthlyExpensePlan')
    or (select private.is_store_owner(store_id))
  )
);

create or replace function public.expense_lock_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select jsonb_build_object(
    'configured', lock.store_id is not null,
    'lockedUntil', case when lock.locked_until > now() then lock.locked_until else null end
  ) into result
  from public.store_members member
  left join private.expense_locks lock on lock.store_id = member.store_id
  where member.user_id = (select auth.uid())
    and member.role = 'owner'
  order by member.created_at
  limit 1;

  if result is null then
    raise exception '관리자만 운영 비용 잠금을 확인할 수 있습니다.';
  end if;

  return result;
end;
$$;

create or replace function public.set_expense_lock_password(p_password text, p_current_password text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_store uuid;
  existing_hash text;
  active_lock_until timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if length(p_password) < 8 or length(p_password) > 72 then
    raise exception '관리 비밀번호는 8자 이상 72자 이하로 입력해 주세요.';
  end if;

  select store_id into target_store
  from public.store_members
  where user_id = (select auth.uid()) and role = 'owner'
  order by created_at limit 1;

  if target_store is null then
    raise exception '관리자만 운영 비용 비밀번호를 설정할 수 있습니다.';
  end if;

  select password_hash, locked_until into existing_hash, active_lock_until
  from private.expense_locks where store_id = target_store;

  if active_lock_until > now() then
    raise exception '비밀번호 입력이 여러 번 틀렸습니다. 잠시 후 다시 시도해 주세요.';
  end if;

  if existing_hash is not null
    and (p_current_password is null or extensions.crypt(p_current_password, existing_hash) <> existing_hash) then
    update private.expense_locks
    set failed_attempts = least(failed_attempts + 1, 5),
        locked_until = case when failed_attempts + 1 >= 5 then now() + interval '5 minutes' else null end
    where store_id = target_store;
    raise exception '현재 관리 비밀번호가 맞지 않습니다.';
  end if;

  insert into private.expense_locks(store_id, password_hash, failed_attempts, locked_until, updated_at, updated_by)
  values (target_store, extensions.crypt(p_password, extensions.gen_salt('bf', 12)), 0, null, now(), auth.uid())
  on conflict (store_id) do update
  set password_hash = excluded.password_hash,
      failed_attempts = 0,
      locked_until = null,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by;
end;
$$;

create or replace function public.verify_expense_lock_password(p_password text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_store uuid;
  stored_hash text;
  attempts integer;
  active_lock_until timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select member.store_id, lock.password_hash, lock.failed_attempts, lock.locked_until
  into target_store, stored_hash, attempts, active_lock_until
    from public.store_members member
    left join private.expense_locks lock on lock.store_id = member.store_id
    where member.user_id = (select auth.uid())
      and member.role = 'owner'
    order by member.created_at
    limit 1;

  if target_store is null then
    raise exception '관리자만 운영 비용 잠금을 해제할 수 있습니다.';
  end if;

  if stored_hash is null then
    raise exception '운영 비용 관리 비밀번호가 아직 설정되지 않았습니다.';
  end if;

  if active_lock_until > now() then
    raise exception '비밀번호 입력이 여러 번 틀렸습니다. 잠시 후 다시 시도해 주세요.';
  end if;

  if extensions.crypt(p_password, stored_hash) = stored_hash then
    update private.expense_locks
    set failed_attempts = 0, locked_until = null
    where store_id = target_store;
    return true;
  end if;

  attempts := least(coalesce(attempts, 0) + 1, 5);
  update private.expense_locks
  set failed_attempts = attempts,
      locked_until = case when attempts >= 5 then now() + interval '5 minutes' else null end
  where store_id = target_store;
  return false;
end;
$$;

create or replace function public.replace_store_dataset(p_meta jsonb, p_records jsonb)
returns void language plpgsql security invoker set search_path = public
as $$
declare
  target_store uuid;
  caller_role text;
begin
  select store_id, role into target_store, caller_role
  from public.store_members
  where user_id = auth.uid() and role in ('owner', 'editor')
  order by created_at limit 1;

  if target_store is null then
    raise exception '편집 권한이 없습니다.';
  end if;

  insert into public.store_datasets(store_id, meta, updated_at, updated_by)
  values(target_store, p_meta, now(), auth.uid())
  on conflict(store_id) do update
  set meta = excluded.meta,
      version = public.store_datasets.version + 1,
      updated_at = now(),
      updated_by = auth.uid();

  delete from public.store_records
  where store_id = target_store
    and (caller_role = 'owner' or collection not in ('expenses', 'monthlyExpensePlan'));

  insert into public.store_records(store_id, collection, record_key, payload, updated_by)
  select target_store, item.collection, item.record_key, item.payload, auth.uid()
  from jsonb_to_recordset(p_records)
    as item(collection text, record_key text, payload jsonb)
  where caller_role = 'owner'
     or item.collection not in ('expenses', 'monthlyExpensePlan');
end;
$$;

revoke execute on function public.expense_lock_status() from public, anon;
revoke execute on function public.set_expense_lock_password(text, text) from public, anon;
revoke execute on function public.verify_expense_lock_password(text) from public, anon;
grant execute on function public.expense_lock_status() to authenticated;
grant execute on function public.set_expense_lock_password(text, text) to authenticated;
grant execute on function public.verify_expense_lock_password(text) to authenticated;
