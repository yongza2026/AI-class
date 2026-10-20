-- Restrict Supabase's automatic-RLS helper to event-trigger use only.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- FOR ALL also creates a SELECT path. Split write policies so member reads have one path.
drop policy "editors write unit conversions v2" on public.unit_conversions_v2;
drop policy "editors write purchase documents v2" on public.purchase_documents_v2;
drop policy "editors write purchase lines v2" on public.purchase_lines_v2;
drop policy "editors write stocktake sessions v2" on public.stocktake_sessions_v2;
drop policy "editors write stocktake lines v2" on public.stocktake_lines_v2;

create policy "editors insert unit conversions v2" on public.unit_conversions_v2 for insert to authenticated with check ((select private.can_edit_store(store_id)));
create policy "editors update unit conversions v2" on public.unit_conversions_v2 for update to authenticated using ((select private.can_edit_store(store_id))) with check ((select private.can_edit_store(store_id)));
create policy "editors delete unit conversions v2" on public.unit_conversions_v2 for delete to authenticated using ((select private.can_edit_store(store_id)));

create policy "editors insert purchase documents v2" on public.purchase_documents_v2 for insert to authenticated with check ((select private.can_edit_store(store_id)));
create policy "editors update purchase documents v2" on public.purchase_documents_v2 for update to authenticated using ((select private.can_edit_store(store_id))) with check ((select private.can_edit_store(store_id)));
create policy "editors delete purchase documents v2" on public.purchase_documents_v2 for delete to authenticated using ((select private.can_edit_store(store_id)));

create policy "editors insert purchase lines v2" on public.purchase_lines_v2 for insert to authenticated with check ((select private.can_edit_store(store_id)));
create policy "editors update purchase lines v2" on public.purchase_lines_v2 for update to authenticated using ((select private.can_edit_store(store_id))) with check ((select private.can_edit_store(store_id)));
create policy "editors delete purchase lines v2" on public.purchase_lines_v2 for delete to authenticated using ((select private.can_edit_store(store_id)));

create policy "editors insert stocktake sessions v2" on public.stocktake_sessions_v2 for insert to authenticated with check ((select private.can_edit_store(store_id)));
create policy "editors update stocktake sessions v2" on public.stocktake_sessions_v2 for update to authenticated using ((select private.can_edit_store(store_id))) with check ((select private.can_edit_store(store_id)));
create policy "editors delete stocktake sessions v2" on public.stocktake_sessions_v2 for delete to authenticated using ((select private.can_edit_store(store_id)));

create policy "editors insert stocktake lines v2" on public.stocktake_lines_v2 for insert to authenticated with check ((select private.can_edit_store(store_id)));
create policy "editors update stocktake lines v2" on public.stocktake_lines_v2 for update to authenticated using ((select private.can_edit_store(store_id))) with check ((select private.can_edit_store(store_id)));
create policy "editors delete stocktake lines v2" on public.stocktake_lines_v2 for delete to authenticated using ((select private.can_edit_store(store_id)));

