-- order_status enum에 '배송준비' 값 추가
-- (ALTER TYPE ... ADD VALUE는 별도 트랜잭션으로 실행되어야 하므로 이 파일만 단독 실행)
alter type order_status add value if not exists '배송준비';
