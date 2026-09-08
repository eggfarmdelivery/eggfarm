-- campaign 테이블도 order_status_log와 동일하게 RLS가 켜져있어 insert가 막히는 문제 발견
-- 이 테이블은 관리자 전용(requireAdmin으로 앱단에서 이미 권한 체크)이라 RLS 불필요
alter table campaign disable row level security;
