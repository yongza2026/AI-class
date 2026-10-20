-- 검토용 초안. 운영 DB에 아직 적용하지 않는다.
-- 기존 표를 변경하거나 삭제하지 않는 추가형 구조다.

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
  unique (store_id, legacy_material_id)
);

create table public.unit_conversions_v2 (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  item_id uuid not null references public.inventory_items_v2(id) on delete cascade,
  input_unit text not null,
  multiplier_to_base numeric(18, 6) not null check (multiplier_to_base > 0),
  label text,
  created_at timestamptz not null default now(),
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
  unique (store_id, client_token)
);

create table public.purchase_lines_v2 (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  document_id uuid not null references public.purchase_documents_v2(id) on delete cascade,
  line_no integer not null check (line_no > 0),
  item_id uuid not null references public.inventory_items_v2(id),
  package_count numeric(18, 6) not null check (package_count > 0),
  purchase_unit text not null,
  package_capacity numeric(18, 6) not null check (package_capacity > 0),
  base_quantity numeric(18, 6) not null check (base_quantity > 0),
  vat_included_amount numeric(18, 2) check (vat_included_amount is null or vat_included_amount >= 0),
  created_at timestamptz not null default now(),
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
  unique (store_id, client_token)
);

create table public.stocktake_lines_v2 (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  session_id uuid not null references public.stocktake_sessions_v2(id) on delete cascade,
  item_id uuid not null references public.inventory_items_v2(id),
  book_quantity numeric(18, 6),
  counted_quantity numeric(18, 6) not null check (counted_quantity >= 0),
  created_at timestamptz not null default now(),
  unique (session_id, item_id)
);

create table public.inventory_ledger_v2 (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  item_id uuid not null references public.inventory_items_v2(id),
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
  reverses_event_id uuid references public.inventory_ledger_v2(id),
  client_token uuid not null,
  memo text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (store_id, client_token),
  unique (store_id, source_type, source_id, source_line_no)
);

create index inventory_items_v2_store_idx on public.inventory_items_v2(store_id, active, name);
create index inventory_ledger_v2_item_time_idx on public.inventory_ledger_v2(store_id, item_id, occurred_at);
create index purchase_documents_v2_store_date_idx on public.purchase_documents_v2(store_id, document_date desc);
create index stocktake_sessions_v2_store_date_idx on public.stocktake_sessions_v2(store_id, business_date desc);

alter table public.inventory_items_v2 enable row level security;
alter table public.unit_conversions_v2 enable row level security;
alter table public.purchase_documents_v2 enable row level security;
alter table public.purchase_lines_v2 enable row level security;
alter table public.stocktake_sessions_v2 enable row level security;
alter table public.stocktake_lines_v2 enable row level security;
alter table public.inventory_ledger_v2 enable row level security;

-- 실제 마이그레이션에서는 아래 정책을 표마다 같은 이름 규칙으로 생성한다.
-- SELECT: private.is_store_member(store_id)
-- INSERT/UPDATE: private.can_edit_store(store_id)
-- inventory_ledger_v2는 UPDATE/DELETE 정책을 만들지 않는다.
-- 모든 표의 public/anon 권한을 회수하고 필요한 authenticated 권한만 부여한다.
-- 입고·실사 확정은 여러 표 쓰기를 하나의 트랜잭션으로 묶는 RPC로 구현한다.
