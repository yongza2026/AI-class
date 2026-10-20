create table public.store_datasets (
  store_id uuid primary key references public.stores(id) on delete cascade,
  meta jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.store_records (
  store_id uuid not null references public.stores(id) on delete cascade,
  collection text not null check (
    collection in (
      'suppliers', 'materials', 'menus', 'recipes', 'priceHistory',
      'calendar', 'sales', 'openingInventory', 'inventoryEvents',
      'expenses', 'monthlyExpensePlan', 'settings', 'purchaseLots',
      'productionBatches', 'bottleStates', 'auditLog'
    )
  ),
  record_key text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (store_id, collection, record_key)
);

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (email = lower(email)),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  assigned_role text not null default 'editor' check (assigned_role in ('editor', 'viewer')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  unique (store_id, user_id),
  unique (store_id, email)
);

create index store_records_collection_idx on public.store_records(store_id, collection);
create index store_datasets_updated_by_idx on public.store_datasets(updated_by);
create index store_records_updated_by_idx on public.store_records(updated_by);
create index access_requests_store_status_idx on public.access_requests(store_id, status, requested_at);
create index access_requests_user_id_idx on public.access_requests(user_id);
create index access_requests_reviewed_by_idx on public.access_requests(reviewed_by);

alter table public.store_datasets enable row level security;
alter table public.store_records enable row level security;
alter table public.access_requests enable row level security;

create policy "members read dataset" on public.store_datasets
for select to authenticated using ((select private.is_store_member(store_id)));
create policy "editors insert dataset" on public.store_datasets
for insert to authenticated with check ((select private.can_edit_store(store_id)));
create policy "editors update dataset" on public.store_datasets
for update to authenticated using ((select private.can_edit_store(store_id)))
with check ((select private.can_edit_store(store_id)));
create policy "owners delete dataset" on public.store_datasets
for delete to authenticated using ((select private.is_store_owner(store_id)));

create policy "members read records" on public.store_records
for select to authenticated using ((select private.is_store_member(store_id)));
create policy "editors insert records" on public.store_records
for insert to authenticated with check ((select private.can_edit_store(store_id)));
create policy "editors update records" on public.store_records
for update to authenticated using ((select private.can_edit_store(store_id)))
with check ((select private.can_edit_store(store_id)));
create policy "editors delete records" on public.store_records
for delete to authenticated using ((select private.can_edit_store(store_id)));

create policy "requesters and owners read access requests" on public.access_requests
for select to authenticated using (
  user_id = (select auth.uid()) or (select private.is_store_owner(store_id))
);
create policy "users request their own access" on public.access_requests
for insert to authenticated with check (
  user_id = (select auth.uid())
  and email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  and store_id = '00000000-0000-4000-8000-000000000001'
  and status = 'pending'
  and not (select private.is_store_member(store_id))
);
create policy "owners review pending access requests" on public.access_requests
for update to authenticated using (
  status = 'pending' and (select private.is_store_owner(store_id))
) with check (
  status in ('approved', 'rejected') and (select private.is_store_owner(store_id))
);

create or replace function private.set_record_audit()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger store_records_audit
before insert or update on public.store_records
for each row execute function private.set_record_audit();

create or replace function private.prepare_access_request_review()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if old.status <> 'pending' then
    raise exception '이미 처리된 가입 요청입니다.';
  end if;
  if new.status not in ('approved', 'rejected') then
    raise exception '승인 또는 거절만 선택할 수 있습니다.';
  end if;
  if not private.is_store_owner(old.store_id) then
    raise exception '관리자만 가입 요청을 처리할 수 있습니다.';
  end if;
  new.reviewed_at := now();
  new.reviewed_by := auth.uid();
  return new;
end;
$$;

create or replace function private.finalize_access_request()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'approved' then
    insert into public.allowed_users(email, store_id, role)
    values (new.email, new.store_id, new.assigned_role)
    on conflict (email) do update
    set store_id = excluded.store_id, role = excluded.role;

    insert into public.store_members(store_id, user_id, role)
    values (new.store_id, new.user_id, new.assigned_role)
    on conflict (store_id, user_id) do update set role = excluded.role;
  end if;
  return new;
end;
$$;

create trigger prepare_access_request_review
before update on public.access_requests
for each row execute function private.prepare_access_request_review();

create trigger finalize_access_request
after update of status on public.access_requests
for each row when (old.status is distinct from new.status)
execute function private.finalize_access_request();

create or replace function public.replace_store_dataset(p_meta jsonb, p_records jsonb)
returns void language plpgsql security invoker set search_path = public
as $$
declare
  target_store uuid;
begin
  select store_id into target_store
  from public.store_members
  where user_id = auth.uid() and role in ('owner', 'editor')
  order by created_at limit 1;

  if target_store is null then
    raise exception '편집 권한이 없습니다.';
  end if;

  insert into public.store_datasets(store_id, meta, updated_at, updated_by)
  values (target_store, p_meta, now(), auth.uid())
  on conflict (store_id) do update
  set meta = excluded.meta,
      version = public.store_datasets.version + 1,
      updated_at = now(),
      updated_by = auth.uid();

  delete from public.store_records where store_id = target_store;
  insert into public.store_records(store_id, collection, record_key, payload, updated_by)
  select target_store, item.collection, item.record_key, item.payload, auth.uid()
  from jsonb_to_recordset(p_records)
    as item(collection text, record_key text, payload jsonb);
end;
$$;

create or replace function public.clear_sample_dataset()
returns void language plpgsql security invoker set search_path = public
as $$
declare
  target_store uuid;
  sample_class text;
begin
  select store_id into target_store
  from public.store_members
  where user_id = auth.uid() and role = 'owner'
  order by created_at limit 1;

  if target_store is null then
    raise exception '관리자 권한이 없습니다.';
  end if;

  select meta->>'dataClass' into sample_class
  from public.store_datasets where store_id = target_store;
  if sample_class is null or position('샘플' in sample_class) = 0 then
    raise exception '가상 샘플 자료만 삭제할 수 있습니다.';
  end if;

  delete from public.store_records where store_id = target_store;
  delete from public.store_datasets where store_id = target_store;
end;
$$;

revoke all on public.store_datasets, public.store_records, public.access_requests
from public, anon, authenticated;
grant select on public.store_datasets, public.store_records, public.access_requests
to authenticated;
grant insert, update, delete on public.store_records to authenticated;
grant insert, update, delete on public.store_datasets to authenticated;
grant insert (user_id, email) on public.access_requests to authenticated;
grant update (status, assigned_role) on public.access_requests to authenticated;

revoke execute on function public.replace_store_dataset(jsonb, jsonb) from public, anon;
revoke execute on function public.clear_sample_dataset() from public, anon;
grant execute on function public.replace_store_dataset(jsonb, jsonb) to authenticated;
grant execute on function public.clear_sample_dataset() to authenticated;
revoke execute on function private.set_record_audit() from public, anon, authenticated, service_role;
revoke execute on function private.prepare_access_request_review() from public, anon, authenticated, service_role;
revoke execute on function private.finalize_access_request() from public, anon, authenticated, service_role;
