-- 크레딧 기능은 당분간 보류하고 환불은 계좌환불로 일원화 - 고객이 입력한 환불계좌 정보 저장용
alter table b2c_order add column if not exists refund_bank_name text;
alter table b2c_order add column if not exists refund_account_number text;
alter table b2c_order add column if not exists refund_holder_name text;
