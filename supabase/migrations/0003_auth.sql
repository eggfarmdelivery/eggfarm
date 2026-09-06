-- =========================================================
-- 카카오 로그인 연동 + 회원 추가정보(주소/공동현관비밀번호)
-- =========================================================

alter table account
  add column auth_user_id uuid unique references auth.users(id) on delete cascade,
  add column address text,
  add column entrance_password text;

-- kakao_user_id는 이제 auth_user_id로 대체되므로 필수(unique) 제약 완화
alter table account alter column kakao_user_id drop not null;
alter table account drop constraint if exists account_kakao_user_id_key;

-- account 조회는 본인 것만 가능(RLS)
alter table account enable row level security;

create policy "본인 계정 조회" on account
  for select using (auth.uid() = auth_user_id);

create policy "본인 계정 생성" on account
  for insert with check (auth.uid() = auth_user_id);

-- B2B는 관리자가 auth_user_id 없이 미리 계정을 만들어두므로,
-- 최초 로그인 시 본인 계정으로 "연결"하는 것도 허용(auth_user_id가 비어있는 행에 한해)
create policy "본인 계정 수정" on account
  for update
  using (auth.uid() = auth_user_id or auth_user_id is null)
  with check (auth.uid() = auth_user_id);
