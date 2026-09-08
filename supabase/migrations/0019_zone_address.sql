-- 단지명만으로는 어디인지 헷갈릴 수 있어 참고용 주소 컬럼 추가
alter table delivery_zone add column if not exists address text;
