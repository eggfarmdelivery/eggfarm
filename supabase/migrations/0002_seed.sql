-- 테스트용 초기 데이터 (실제 운영 전 상품명/가격/단지명은 관리자 화면에서 수정)

insert into product (name, base_price) values
  ('왕란', 18000),
  ('특란', 15000),
  ('대란', 13000);

insert into delivery_zone (name) values
  ('래미안 OO단지');

-- 오늘 날짜 기준 재고/한도 초기값 (상품별 기준재고 100, 초과허용 30%, 1인당 2판)
insert into product_limit_schedule (product_id, effective_date, stock_limit, overflow_rate, per_person_limit)
select id, current_date, 100, 0.3, 2 from product;
