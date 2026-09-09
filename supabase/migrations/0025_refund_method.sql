-- 주문취소 시 선택한 환불방법(적립금/계좌) 기록 - 관리자가 실제 환불 처리할 때 어떤 처리를 해야하는지 구분
alter table b2c_order add column if not exists refund_method text check (refund_method in ('credit', 'bank'));
