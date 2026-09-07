-- =========================================================
-- 마이페이지에서 주소를 다시 수정할 수 있도록, 합쳐진 address 문자열 외에
-- 원본 구성요소(기본주소/동/호수)도 별도 컬럼으로 저장
-- =========================================================

alter table account add column if not exists base_address text;
alter table account add column if not exists address_dong text;
alter table account add column if not exists address_ho text;
