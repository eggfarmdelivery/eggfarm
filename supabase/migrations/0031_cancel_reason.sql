-- 관리자가 주문취소할 때 입력하는 사유. 구매자에게 노출해서 취소된 이유를 알 수 있게 함
alter table b2c_order add column if not exists cancel_reason text;
