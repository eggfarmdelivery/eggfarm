-- geo_reason만으로는 "카카오 API 요청 오류"처럼 뭉뚱그려서만 보여서, 실제 HTTP 상태코드/응답 본문까지
-- 저장해서 정확히 어떤 오류인지(권한 문제 401/403, 요청 형식 문제 400 등) 관리자 화면에서 바로 볼 수 있게 함
alter table zone_request add column if not exists geo_detail text;
