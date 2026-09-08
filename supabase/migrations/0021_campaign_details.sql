-- 캠페인에 상세정보(제목/사진/오픈일시) 추가 + 캠페인별 포함 품목 선택 테이블 신설
alter table campaign add column if not exists title text;
alter table campaign add column if not exists photo_url text;
alter table campaign add column if not exists opens_at timestamptz not null default now();

create table if not exists campaign_product (
  campaign_id uuid not null references campaign(id) on delete cascade,
  product_id uuid not null references product(id) on delete cascade,
  primary key (campaign_id, product_id)
);
-- campaign과 동일하게 앱단(requireAdmin)에서만 쓰기가 일어나는 테이블이라 RLS 비활성화로 시작
alter table campaign_product disable row level security;
