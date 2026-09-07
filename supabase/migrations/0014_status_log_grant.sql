-- order_status_log 테이블에 앱(anon)이 쓸 수 있는 권한 명시적으로 부여
grant select, insert on order_status_log to anon, authenticated;
