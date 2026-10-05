-- 상시운영 전환: 캠페인 대신 "배송요일 + 전체 재고 풀" 방식
-- Supabase SQL Editor에서 한 번만 실행하세요. (여러 번 실행해도 안전하게 작성됨)

-- 1) 상품별 현재 재고 (B2C 주문 시 자동 차감, 관리자가 입고 시 추가)
alter table product add column if not exists stock_qty integer not null default 0;

-- 2) 주문의 배송 예정일 (주문 시점에 계산해서 저장)
alter table b2c_order add column if not exists delivery_date date;
create index if not exists b2c_order_delivery_date_idx on b2c_order(delivery_date);

-- 기존 주문은 캠페인의 배송일로 채움 (배송 리스트에서 날짜로도 조회 가능)
update b2c_order o
   set delivery_date = c.delivery_date
  from campaign c
 where o.campaign_id = c.id
   and o.delivery_date is null
   and c.delivery_date is not null;

-- 3) 재고 변동 기록
create table if not exists stock_log (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references product(id),
  delta integer not null,
  qty_after integer not null,
  reason text not null,          -- 입고 / 주문 / 수정 / 취소복원 / 직접수정
  order_id uuid,                 -- 주문 생성 직전에 번호를 정해 쓰므로 외래키는 걸지 않음
  created_at timestamptz not null default now()
);
create index if not exists stock_log_product_idx on stock_log(product_id, created_at desc);
create index if not exists stock_log_order_idx on stock_log(order_id);
alter table stock_log enable row level security;

-- 4) 재고 조정 함수: 부족하면 실패(INSUFFICIENT_STOCK), 확인+변경이 한 번에 처리돼서 동시 주문에도 초과 판매 없음
create or replace function adjust_stock(
  p_product uuid,
  p_delta integer,
  p_reason text,
  p_order uuid default null
) returns integer
language plpgsql
as $$
declare
  v_new integer;
begin
  update product
     set stock_qty = stock_qty + p_delta
   where id = p_product
     and stock_qty + p_delta >= 0
  returning stock_qty into v_new;

  if v_new is null then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  insert into stock_log (product_id, delta, qty_after, reason, order_id)
  values (p_product, p_delta, v_new, p_reason, p_order);

  return v_new;
end;
$$;

-- 5) 운영 설정값 (이미 값이 있으면 건드리지 않음)
insert into system_config (key, value) values
  ('delivery_weekdays', '2,4,6'),     -- 0=일 1=월 2=화 3=수 4=목 5=금 6=토
  ('order_cutoff_time', '17:00'),
  ('delivery_start_time', '18:00'),
  ('delivery_fee', '1000'),
  ('free_shipping_min_qty', '2'),
  ('per_person_limit', '3'),          -- 배송일당 1인 합계 한도(0이면 제한 없음)
  ('low_stock_alert_threshold', '10')
on conflict (key) do nothing;
