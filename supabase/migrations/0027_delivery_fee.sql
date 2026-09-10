-- 캠페인별 배송비 설정(건당 금액 + 무료배송 기준 판수) 및 주문에 실제 부과된 배송비 기록
alter table campaign add column if not exists delivery_fee integer not null default 1000;
alter table campaign add column if not exists free_shipping_min_qty integer not null default 2;
alter table b2c_order add column if not exists delivery_fee integer not null default 0;
