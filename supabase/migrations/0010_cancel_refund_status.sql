-- 주문취소/환불 관련 상태값 추가
alter type order_status add value if not exists '환불대기';
alter type order_status add value if not exists '환불완료';
