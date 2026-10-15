create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.allowed_users (
  email text primary key check (email = lower(email)),
  store_id uuid not null references public.stores(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.store_members (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create table if not exists public.store_datasets (
  store_id uuid primary key references public.stores(id) on delete cascade,
  meta jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.store_records (
  store_id uuid not null references public.stores(id) on delete cascade,
  collection text not null check (collection in ('suppliers','materials','menus','recipes','priceHistory','calendar','sales','openingInventory','inventoryEvents','expenses','monthlyExpensePlan','settings')),
  record_key text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (store_id, collection, record_key)
);

create index if not exists store_records_collection_idx on public.store_records(store_id, collection);
create index if not exists allowed_users_store_id_idx on public.allowed_users(store_id);
create index if not exists store_members_user_id_idx on public.store_members(user_id);
create index if not exists store_datasets_updated_by_idx on public.store_datasets(updated_by);
create index if not exists store_records_updated_by_idx on public.store_records(updated_by);

create or replace function private.is_store_member(target_store uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.store_members where store_id = target_store and user_id = (select auth.uid())) $$;

create or replace function private.can_edit_store(target_store uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.store_members where store_id = target_store and user_id = (select auth.uid()) and role in ('owner','editor')) $$;

create or replace function private.is_store_owner(target_store uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.store_members where store_id = target_store and user_id = (select auth.uid()) and role = 'owner') $$;

revoke execute on function private.is_store_member(uuid) from public, anon, authenticated, service_role;
revoke execute on function private.can_edit_store(uuid) from public, anon, authenticated, service_role;
revoke execute on function private.is_store_owner(uuid) from public, anon, authenticated, service_role;

alter table public.stores enable row level security;
alter table public.allowed_users enable row level security;
alter table public.store_members enable row level security;
alter table public.store_datasets enable row level security;
alter table public.store_records enable row level security;

create policy "members read stores" on public.stores for select to authenticated using ((select private.is_store_member(id)));
create policy "deny client access to allowlist" on public.allowed_users for all to authenticated using (false) with check (false);
create policy "members read own membership" on public.store_members for select to authenticated using (user_id = (select auth.uid()));
create policy "members read dataset" on public.store_datasets for select to authenticated using ((select private.is_store_member(store_id)));
create policy "editors insert dataset" on public.store_datasets for insert to authenticated with check ((select private.can_edit_store(store_id)));
create policy "editors update dataset" on public.store_datasets for update to authenticated using ((select private.can_edit_store(store_id))) with check ((select private.can_edit_store(store_id)));
create policy "owners delete dataset" on public.store_datasets for delete to authenticated using ((select private.is_store_owner(store_id)));
create policy "members read records" on public.store_records for select to authenticated using ((select private.is_store_member(store_id)));
create policy "editors insert records" on public.store_records for insert to authenticated with check ((select private.can_edit_store(store_id)));
create policy "editors update records" on public.store_records for update to authenticated using ((select private.can_edit_store(store_id))) with check ((select private.can_edit_store(store_id)));
create policy "editors delete records" on public.store_records for delete to authenticated using ((select private.can_edit_store(store_id)));

create or replace function private.set_record_audit()
returns trigger language plpgsql security invoker set search_path = public
as $$ begin new.updated_at = now(); new.updated_by = auth.uid(); return new; end $$;
create trigger store_records_audit before insert or update on public.store_records for each row execute function private.set_record_audit();

create or replace function private.handle_approved_user()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  insert into public.store_members(store_id, user_id, role)
  select store_id, new.id, role from public.allowed_users where email = lower(new.email)
  on conflict (store_id, user_id) do update set role = excluded.role;
  return new;
end $$;
create trigger approved_user_membership after insert or update of email on auth.users for each row execute function private.handle_approved_user();

create or replace function public.replace_store_dataset(p_meta jsonb, p_records jsonb)
returns void language plpgsql security invoker set search_path = public
as $$ declare target_store uuid; begin
  select store_id into target_store from public.store_members where user_id = auth.uid() and role in ('owner','editor') order by created_at limit 1;
  if target_store is null then raise exception '편집 권한이 없습니다.'; end if;
  insert into public.store_datasets(store_id, meta, updated_at, updated_by) values(target_store, p_meta, now(), auth.uid())
  on conflict(store_id) do update set meta = excluded.meta, version = public.store_datasets.version + 1, updated_at = now(), updated_by = auth.uid();
  delete from public.store_records where store_id = target_store;
  insert into public.store_records(store_id, collection, record_key, payload, updated_by)
  select target_store, item.collection, item.record_key, item.payload, auth.uid()
  from jsonb_to_recordset(p_records) as item(collection text, record_key text, payload jsonb);
end $$;

create or replace function public.clear_sample_dataset()
returns void language plpgsql security invoker set search_path = public
as $$ declare target_store uuid; sample_class text; begin
  select store_id into target_store from public.store_members where user_id = auth.uid() and role = 'owner' order by created_at limit 1;
  if target_store is null then raise exception '관리자 권한이 없습니다.'; end if;
  select meta->>'dataClass' into sample_class from public.store_datasets where store_id = target_store;
  if sample_class is null or position('샘플' in sample_class) = 0 then raise exception '가상 샘플 자료만 삭제할 수 있습니다.'; end if;
  delete from public.store_records where store_id = target_store;
  delete from public.store_datasets where store_id = target_store;
end $$;

revoke all on public.stores, public.allowed_users, public.store_members, public.store_datasets, public.store_records from public, anon, authenticated;
grant select on public.stores, public.store_members, public.store_datasets, public.store_records to authenticated;
grant insert, update on public.store_datasets to authenticated;
grant insert, update, delete on public.store_records to authenticated;
grant delete on public.store_datasets to authenticated;
revoke execute on function public.replace_store_dataset(jsonb, jsonb) from public, anon;
revoke execute on function public.clear_sample_dataset() from public, anon;
grant execute on function public.replace_store_dataset(jsonb, jsonb) to authenticated;
grant execute on function public.clear_sample_dataset() to authenticated;

insert into public.stores(id, name) values('00000000-0000-4000-8000-000000000001', 'POCO') on conflict(id) do update set name = excluded.name;
insert into public.allowed_users(email, store_id, role) values('oran99@ecojv.com', '00000000-0000-4000-8000-000000000001', 'owner')
on conflict(email) do update set store_id = excluded.store_id, role = excluded.role;
insert into public.store_members(store_id, user_id, role)
select '00000000-0000-4000-8000-000000000001', id, 'owner' from auth.users where lower(email) = 'oran99@ecojv.com'
on conflict(store_id, user_id) do update set role = excluded.role;
