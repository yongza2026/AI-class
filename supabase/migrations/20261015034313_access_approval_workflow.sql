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

create index access_requests_store_status_idx
on public.access_requests (store_id, status, requested_at);

create index access_requests_user_id_idx
on public.access_requests (user_id);

create index access_requests_reviewed_by_idx
on public.access_requests (reviewed_by);

alter table public.access_requests enable row level security;

create policy "requesters and owners read access requests"
on public.access_requests
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_store_owner(store_id))
);

create policy "users request their own access"
on public.access_requests
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  and store_id = '00000000-0000-4000-8000-000000000001'
  and status = 'pending'
  and not (select private.is_store_member(store_id))
);

create policy "owners review pending access requests"
on public.access_requests
for update
to authenticated
using (
  status = 'pending'
  and (select private.is_store_owner(store_id))
)
with check (
  status in ('approved', 'rejected')
  and (select private.is_store_owner(store_id))
);

create or replace function private.prepare_access_request_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
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
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' then
    insert into public.allowed_users (email, store_id, role)
    values (new.email, new.store_id, new.assigned_role)
    on conflict (email) do update
    set store_id = excluded.store_id,
        role = excluded.role;

    insert into public.store_members (store_id, user_id, role)
    values (new.store_id, new.user_id, new.assigned_role)
    on conflict (store_id, user_id) do update
    set role = excluded.role;
  end if;
  return new;
end;
$$;

create trigger prepare_access_request_review
before update on public.access_requests
for each row execute function private.prepare_access_request_review();

create trigger finalize_access_request
after update of status on public.access_requests
for each row
when (old.status is distinct from new.status)
execute function private.finalize_access_request();

revoke all on public.access_requests from public, anon, authenticated;
grant select on public.access_requests to authenticated;
grant insert (user_id, email) on public.access_requests to authenticated;
grant update (status, assigned_role) on public.access_requests to authenticated;

revoke execute on function private.prepare_access_request_review() from public, anon, authenticated, service_role;
revoke execute on function private.finalize_access_request() from public, anon, authenticated, service_role;
