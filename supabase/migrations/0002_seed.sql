-- 테스트용 초기 데이터 (실제 운영 전 상품명/가격/단지명은 관리자 화면에서 수정)
-- 여러 번 실행해도 중복 생성되지 않도록 이름 기준 존재여부 체크

insert into product (name, base_price)
select v.name, v.base_price
from (values ('왕란', 18000), ('특란', 15000), ('대란', 13000)) as v(name, base_price)
where not exists (select 1 from product p where p.name = v.name);

insert into delivery_zone (name)
select '래미안 OO단지'
where not exists (select 1 from delivery_zone where name = '래미안 OO단지');

-- 오늘 날짜 기준 재고/한도 초기값 (상품별 기준재고 100, 초과허용 30%, 1인당 2판)
-- 이미 오늘자 값이 있는 상품은 건너뜀
insert into product_limit_schedule (product_id, effective_date, stock_limit, overflow_rate, per_person_limit)
select id, current_date, 100, 0.3, 2
from product p
where not exists (
  select 1 from product_limit_schedule s
  where s.product_id = p.id and s.effective_date = current_date
);
