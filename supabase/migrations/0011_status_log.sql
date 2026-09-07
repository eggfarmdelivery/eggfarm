-- 관리자 상태변경 이력 로그
create table if not exists order_status_log (
  id uuid primary key default gen_random_uuid(),
  order_table text not null,          -- 'b2c_order' or 'b2b_order'
  order_id uuid not null,
  from_status text,
  to_status text not null,
  changed_by text not null default 'admin',
  created_at timestamptz not null default now()
);
create index if not exists idx_order_status_log_order on order_status_log(order_table, order_id);
