-- 일반배송 주문을 "상시판매"가 아니라 관리자가 배송 가능할 때 여는 캠페인(오픈~마감) 방식으로 전환
-- 항상 가장 최근(created_at) 1건만 "현재 캠페인"으로 취급함
create table if not exists campaign (
  id uuid primary key default gen_random_uuid(),
  closes_at timestamptz not null,
  closed_early_at timestamptz,
  created_at timestamptz not null default now()
);
