-- 상품 노출 순서 (작을수록 먼저). 기존 상품은 지금 순서(등록순) 그대로 번호를 붙임
alter table product add column if not exists sort_order integer not null default 0;

update product p
   set sort_order = r.rn
  from (select id, row_number() over (order by created_at asc) as rn from product) r
 where p.id = r.id and p.sort_order = 0;
