-- 사장님(owner) 외에 제한된 권한만 가진 관리 직원 계정을 추가할 수 있게 함.
-- 예: 입금확인 담당자는 주문관리만, 배송 담당자는 배송리스트만 접근 가능
create table admin_staff (
  id uuid primary key default gen_random_uuid(),
  kakao_id text not null unique,
  label text,
  permission text not null check (permission in ('payment', 'delivery')),
  created_at timestamptz not null default now()
);

alter table admin_staff enable row level security;
-- 서버(서비스롤)에서만 접근 - 일반 클라이언트 정책 없음
