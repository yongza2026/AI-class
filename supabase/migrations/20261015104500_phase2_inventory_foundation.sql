-- PHASE 2 inventory foundation. Additive only: existing JSON records remain untouched.

create table public.inventory_items_v2 (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  legacy_material_id text,
  name text not null,
  category text not null,
  base_unit text not null check (base_unit in ('ml', 'g', '개')),
  active boolean not null default true,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  unique (store_id, id),
  unique (store_id, legacy_material_id)
);

create table public.unit_conversions_v2 (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  item_id uuid not null,
  input_unit text not null,
  multiplier_to_base numeric(18, 6) not null check (multiplier_to_base > 0),
  label text,
  created_at timestamptz not null default now(),
  foreign key (store_id, item_id) references public.inventory_items_v2(store_id, id) on delete cascade,
  unique (store_id, item_id, input_unit)
);

create table public.purchase_documents_v2 (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier_legacy_id text,
  document_no text,
  document_date date not null,
  status text not null default 'draft' check (status in ('draft', 'received', 'cancelled')),
  source_file_hash text,
  client_token uuid not null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  unique (store_id, id),
  unique (store_id, client_token)
);

create table public.purchase_lines_v2 (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  document_id uuid not null,
  line_no integer not null check (line_no > 0),
  item_id uuid not null,
  package_count numeric(18, 6) not null check (package_count > 0),
  purchase_unit text not null,
  package_capacity numeric(18, 6) not null check (package_capacity > 0),
  base_quantity numeric(18, 6) not null check (base_quantity > 0),
  vat_included_amount numeric(18, 2) check (vat_included_amount is null or vat_included_amount >= 0),
  created_at timestamptz not null default now(),
  foreign key (store_id, document_id) references public.purchase_documents_v2(store_id, id) on delete cascade,
  foreign key (store_id, item_id) references public.inventory_items_v2(store_id, id),
  unique (document_id, line_no)
);

create table public.stocktake_sessions_v2 (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  business_date date not null,
  status text not null default 'draft' check (status in ('draft', 'posted', 'cancelled')),
  client_token uuid not null,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (store_id, id),
  unique (store_id, client_token)
);

create table public.stocktake_lines_v2 (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  session_id uuid not null,
  item_id uuid not null,
  book_quantity numeric(18, 6),
  counted_quantity numeric(18, 6) not null check (counted_quantity >= 0),
  created_at timestamptz not null default now(),
  foreign key (store_id, session_id) references public.stocktake_sessions_v2(store_id, id) on delete cascade,
  foreign key (store_id, item_id) references public.inventory_items_v2(store_id, id),
  unique (session_id, item_id)
);

create table public.inventory_ledger_v2 (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  item_id uuid not null,
  business_date date not null,
  occurred_at timestamptz not null default now(),
  movement_type text not null check (movement_type in (
    'receipt', 'sale', 'production_input', 'production_output',
    'waste', 'rd_use', 'stocktake_adjustment', 'reversal'
  )),
  base_quantity numeric(18, 6) not null check (base_quantity <> 0),
  unit_cost numeric(18, 6) check (unit_cost is null or unit_cost >= 0),
  source_type text not null,
  source_id uuid,
  source_line_no integer,
  reverses_event_id uuid,
  client_token uuid not null,
  memo text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (store_id, id),
  foreign key (store_id, item_id) references public.inventory_items_v2(store_id, id),
  foreign key (store_id, reverses_event_id) references public.inventory_ledger_v2(store_id, id),
  unique (store_id, client_token),
  unique nulls not distinct (store_id, source_type, source_id, source_line_no)
);

create index inventory_items_v2_store_idx on public.inventory_items_v2(store_id, active, name);
create index inventory_ledger_v2_item_time_idx on public.inventory_ledger_v2(store_id, item_id, occurred_at);
create index purchase_documents_v2_store_date_idx on public.purchase_documents_v2(store_id, document_date desc);
create index stocktake_sessions_v2_store_date_idx on public.stocktake_sessions_v2(store_id, business_date desc);

create or replace function private.touch_phase2_row()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.version := old.version + 1;
  return new;
end;
$$;

create trigger inventory_items_v2_touch
before update on public.inventory_items_v2
for each row execute function private.touch_phase2_row();

create trigger purchase_documents_v2_touch
before update on public.purchase_documents_v2
for each row execute function private.touch_phase2_row();

alter table public.inventory_items_v2 enable row level security;
alter table public.unit_conversions_v2 enable row level security;
alter table public.purchase_documents_v2 enable row level security;
alter table public.purchase_lines_v2 enable row level security;
alter table public.stocktake_sessions_v2 enable row level security;
alter table public.stocktake_lines_v2 enable row level security;
alter table public.inventory_ledger_v2 enable row level security;

create policy "members read inventory items v2" on public.inventory_items_v2
for select to authenticated using ((select private.is_store_member(store_id)));
create policy "editors insert inventory items v2" on public.inventory_items_v2
for insert to authenticated with check ((select private.can_edit_store(store_id)));
create policy "editors update inventory items v2" on public.inventory_items_v2
for update to authenticated using ((select private.can_edit_store(store_id))) with check ((select private.can_edit_store(store_id)));
create policy "editors delete inventory items v2" on public.inventory_items_v2
for delete to authenticated using ((select private.can_edit_store(store_id)));

create policy "members read unit conversions v2" on public.unit_conversions_v2
for select to authenticated using ((select private.is_store_member(store_id)));
create policy "editors write unit conversions v2" on public.unit_conversions_v2
for all to authenticated using ((select private.can_edit_store(store_id))) with check ((select private.can_edit_store(store_id)));

create policy "members read purchase documents v2" on public.purchase_documents_v2
for select to authenticated using ((select private.is_store_member(store_id)));
create policy "editors write purchase documents v2" on public.purchase_documents_v2
for all to authenticated using ((select private.can_edit_store(store_id))) with check ((select private.can_edit_store(store_id)));

create policy "members read purchase lines v2" on public.purchase_lines_v2
for select to authenticated using ((select private.is_store_member(store_id)));
create policy "editors write purchase lines v2" on public.purchase_lines_v2
for all to authenticated using ((select private.can_edit_store(store_id))) with check ((select private.can_edit_store(store_id)));

create policy "members read stocktake sessions v2" on public.stocktake_sessions_v2
for select to authenticated using ((select private.is_store_member(store_id)));
create policy "editors write stocktake sessions v2" on public.stocktake_sessions_v2
for all to authenticated using ((select private.can_edit_store(store_id))) with check ((select private.can_edit_store(store_id)));

create policy "members read stocktake lines v2" on public.stocktake_lines_v2
for select to authenticated using ((select private.is_store_member(store_id)));
create policy "editors write stocktake lines v2" on public.stocktake_lines_v2
for all to authenticated using ((select private.can_edit_store(store_id))) with check ((select private.can_edit_store(store_id)));

create policy "members read inventory ledger v2" on public.inventory_ledger_v2
for select to authenticated using ((select private.is_store_member(store_id)));
create policy "editors append inventory ledger v2" on public.inventory_ledger_v2
for insert to authenticated with check ((select private.can_edit_store(store_id)));

revoke all on public.inventory_items_v2, public.unit_conversions_v2,
  public.purchase_documents_v2, public.purchase_lines_v2,
  public.stocktake_sessions_v2, public.stocktake_lines_v2,
  public.inventory_ledger_v2 from public, anon, authenticated;

grant select on public.inventory_items_v2, public.unit_conversions_v2,
  public.purchase_documents_v2, public.purchase_lines_v2,
  public.stocktake_sessions_v2, public.stocktake_lines_v2,
  public.inventory_ledger_v2 to authenticated;

grant insert, update, delete on public.inventory_items_v2, public.unit_conversions_v2,
  public.purchase_documents_v2, public.purchase_lines_v2,
  public.stocktake_sessions_v2, public.stocktake_lines_v2 to authenticated;

grant insert on public.inventory_ledger_v2 to authenticated;

revoke execute on function private.touch_phase2_row() from public, anon, authenticated, service_role;
