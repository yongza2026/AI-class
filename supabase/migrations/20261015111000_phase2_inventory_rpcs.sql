create or replace function public.post_purchase_receipt_v2(
  p_document_id uuid,
  p_expected_version bigint
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_document public.purchase_documents_v2%rowtype;
  inserted_count integer := 0;
begin
  select * into target_document
  from public.purchase_documents_v2
  where id = p_document_id
  for update;

  if not found then
    raise exception '구매 문서를 찾을 수 없습니다.';
  end if;
  if not private.can_edit_store(target_document.store_id) then
    raise exception '입고를 확정할 권한이 없습니다.';
  end if;
  if target_document.status = 'received' then
    return jsonb_build_object('status', 'already_received', 'inserted', 0, 'version', target_document.version);
  end if;
  if target_document.status <> 'draft' then
    raise exception '임시 저장 상태의 구매 문서만 입고 확정할 수 있습니다.';
  end if;
  if target_document.version <> p_expected_version then
    raise exception '다른 사용자가 먼저 구매 문서를 수정했습니다. 새로고침 후 다시 확인해 주세요.';
  end if;
  if not exists (select 1 from public.purchase_lines_v2 where document_id = p_document_id) then
    raise exception '입고할 품목이 없습니다.';
  end if;

  insert into public.inventory_ledger_v2 (
    store_id, item_id, business_date, movement_type, base_quantity,
    unit_cost, source_type, source_id, source_line_no, client_token, created_by
  )
  select
    line.store_id,
    line.item_id,
    target_document.document_date,
    'receipt',
    line.base_quantity,
    case when line.vat_included_amount is null then null
      else line.vat_included_amount / line.base_quantity end,
    'purchase_receipt',
    target_document.id,
    line.line_no,
    gen_random_uuid(),
    auth.uid()
  from public.purchase_lines_v2 line
  where line.document_id = p_document_id
  on conflict (store_id, source_type, source_id, source_line_no) do nothing;

  get diagnostics inserted_count = row_count;

  update public.purchase_documents_v2
  set status = 'received'
  where id = p_document_id;

  return jsonb_build_object(
    'status', 'received',
    'inserted', inserted_count,
    'version', target_document.version + 1
  );
end;
$$;

create or replace function public.post_stocktake_v2(p_session_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_session public.stocktake_sessions_v2%rowtype;
  inserted_count integer := 0;
begin
  select * into target_session
  from public.stocktake_sessions_v2
  where id = p_session_id
  for update;

  if not found then
    raise exception '실사 회차를 찾을 수 없습니다.';
  end if;
  if not private.can_edit_store(target_session.store_id) then
    raise exception '실사를 확정할 권한이 없습니다.';
  end if;
  if target_session.status = 'posted' then
    return jsonb_build_object('status', 'already_posted', 'inserted', 0);
  end if;
  if target_session.status <> 'draft' then
    raise exception '임시 저장 상태의 실사만 확정할 수 있습니다.';
  end if;
  if not exists (select 1 from public.stocktake_lines_v2 where session_id = p_session_id) then
    raise exception '실사한 품목이 없습니다.';
  end if;

  update public.stocktake_lines_v2 line
  set book_quantity = coalesce((
    select sum(ledger.base_quantity)
    from public.inventory_ledger_v2 ledger
    where ledger.store_id = line.store_id
      and ledger.item_id = line.item_id
      and ledger.occurred_at <= now()
  ), 0)
  where line.session_id = p_session_id;

  insert into public.inventory_ledger_v2 (
    store_id, item_id, business_date, movement_type, base_quantity,
    source_type, source_id, source_line_no, client_token, created_by
  )
  select
    line.store_id,
    line.item_id,
    target_session.business_date,
    'stocktake_adjustment',
    line.counted_quantity - line.book_quantity,
    'stocktake',
    target_session.id,
    row_number() over (order by line.item_id),
    gen_random_uuid(),
    auth.uid()
  from public.stocktake_lines_v2 line
  where line.session_id = p_session_id
    and line.counted_quantity <> line.book_quantity
  on conflict (store_id, source_type, source_id, source_line_no) do nothing;

  get diagnostics inserted_count = row_count;

  update public.stocktake_sessions_v2
  set status = 'posted', posted_at = now()
  where id = p_session_id;

  return jsonb_build_object('status', 'posted', 'inserted', inserted_count);
end;
$$;

revoke execute on function public.post_purchase_receipt_v2(uuid, bigint) from public, anon;
revoke execute on function public.post_stocktake_v2(uuid) from public, anon;
grant execute on function public.post_purchase_receipt_v2(uuid, bigint) to authenticated;
grant execute on function public.post_stocktake_v2(uuid) to authenticated;
