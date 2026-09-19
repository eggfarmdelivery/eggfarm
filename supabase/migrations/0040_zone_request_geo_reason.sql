-- 단지 추가 요청 중 좌표를 못 찾은 건이 "왜" 못 찾았는지 관리자 화면에서 바로 확인할 수 있게
-- 실패 사유(reason)를 저장하는 컬럼 추가 (not_found / http_error / network_error / no_key 등)
alter table zone_request add column if not exists geo_reason text;
