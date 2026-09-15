-- 발주 마감(평일 낮 12시)이 지났거나 주말에 들어온 발주는 막지 않고 접수는 하되,
-- 다음 영업일 발주로 자동 배정하고 사장님 승인 전까지는 "승인대기" 상태로 대기시킴
alter type b2b_order_status add value if not exists '승인대기';
