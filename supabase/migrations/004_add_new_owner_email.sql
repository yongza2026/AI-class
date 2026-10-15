insert into public.allowed_users (email, store_id, role)
values (
  'yong201712@gmail.com',
  '00000000-0000-4000-8000-000000000001',
  'owner'
)
on conflict (email) do update
set store_id = excluded.store_id,
    role = excluded.role;
