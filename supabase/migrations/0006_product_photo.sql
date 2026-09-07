-- 상품 사진 저장용 컬럼 + 스토리지 버킷

alter table product add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;
