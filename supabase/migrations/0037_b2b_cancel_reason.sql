-- B2B 발주 취소 시 사유를 남기고, 관리자/거래처 서로 확인할 수 있게 함
alter table b2b_order add column if not exists cancel_reason text;

-- 거래처가 발주 생성 이후에 "상품 추가"로 나중에 담은 항목인지 구분(관리자가 배송 전 놓치지 않도록 표시하는 용도)
alter table b2b_order_item add column if not exists added_later boolean not null default false;
