-- 캠페인마다 배송가능 단지를 여러 개 지정 가능(N:N) - 지정 안 된 단지 주민은 그 캠페인 주문 불가
create table if not exists campaign_zone (
  campaign_id uuid not null references campaign(id) on delete cascade,
  delivery_zone_id uuid not null references delivery_zone(id) on delete cascade,
  primary key (campaign_id, delivery_zone_id)
);
alter table campaign_zone disable row level security;
