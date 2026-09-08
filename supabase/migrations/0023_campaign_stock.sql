-- 캠페인별 독립 재고/인당제한 + 배송예정일 + 주문의 캠페인 연결
alter table campaign_product add column if not exists stock_limit integer not null default 0;
alter table campaign_product add column if not exists per_person_limit integer;
alter table campaign add column if not exists delivery_date date;
alter table b2c_order add column if not exists campaign_id uuid references campaign(id);
