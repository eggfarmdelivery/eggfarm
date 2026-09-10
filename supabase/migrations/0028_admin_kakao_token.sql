-- 관리자용 카카오 "나에게 보내기" 알림 발송을 위한 토큰 저장(관리자 1명 기준 단일 행)
create table if not exists admin_kakao_token (
  id text primary key default 'default',
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table admin_kakao_token disable row level security;
