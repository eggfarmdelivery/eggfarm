-- 반복 테스트용 계정을 캠페인 재고/대시보드 통계에서 제외하기 위한 플래그
alter table account add column if not exists is_test boolean not null default false;
