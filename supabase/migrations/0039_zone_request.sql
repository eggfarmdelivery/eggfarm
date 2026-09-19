-- 로그인전 화면에서 비로그인 방문자가 남기는 "단지 추가 요청" 기록
-- 로그인 여부와 무관하게 누구나 남길 수 있음(회원 X) - 주소는 동/호수 없는 도로명주소만 저장
create table if not exists zone_request (
  id uuid primary key default gen_random_uuid(),
  road_address text not null,
  lat double precision,
  lng double precision,
  ip_hash text,
  created_at timestamptz not null default now()
);

-- RLS 정책 없음 = 서버(서비스롤 키)에서만 접근 가능. 클라이언트는 서버 액션을 통해서만 기록/조회함
alter table zone_request enable row level security;

create index if not exists zone_request_created_at_idx on zone_request (created_at desc);
create index if not exists zone_request_road_address_idx on zone_request (road_address);
create index if not exists zone_request_ip_hash_idx on zone_request (ip_hash, created_at);
