-- 크레딧 우선차감 결제 방식 지원: 주문에 크레딧으로 결제한 금액을 별도 기록
alter table b2c_order add column if not exists credit_used integer not null default 0;
