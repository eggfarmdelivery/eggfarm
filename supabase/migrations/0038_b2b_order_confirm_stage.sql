-- B2B 발주 흐름에 "주문확정" 단계 추가: 발주요청 -> 주문확정 -> 배송중
-- (사장님이 발주요청을 바로 배송시작하지 않고, 한 번 확인/승인하는 단계를 거치게 함)
alter type b2b_order_status add value if not exists '주문확정';
