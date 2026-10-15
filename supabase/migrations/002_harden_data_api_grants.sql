revoke all on public.stores, public.allowed_users, public.store_members, public.store_datasets, public.store_records from public, anon, authenticated;

grant select on public.stores, public.store_members, public.store_datasets, public.store_records to authenticated;
grant insert, update, delete on public.store_records to authenticated;
grant insert, update, delete on public.store_datasets to authenticated;

revoke execute on function public.replace_store_dataset(jsonb, jsonb) from public, anon;
revoke execute on function public.clear_sample_dataset() from public, anon;
grant execute on function public.replace_store_dataset(jsonb, jsonb) to authenticated;
grant execute on function public.clear_sample_dataset() to authenticated;
