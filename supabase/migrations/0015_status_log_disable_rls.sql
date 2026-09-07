-- order_status_log는 앱(requireAdmin) 레벨에서 권한 체크하는 내부 로그 테이블.
-- 대시보드 등에서 RLS가 켜지며 insert policy 부재로 "이력 저장 실패"가 발생했던 문제 수정.
alter table order_status_log disable row level security;
