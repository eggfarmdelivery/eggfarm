-- =========================================================
-- 배송완료 사진 저장용 스토리지 버킷
-- 관리자(admin)는 커스텀 쿠키 인증이라 Supabase Auth 사용자가 아니므로,
-- 업로드는 서버 액션에서 서비스롤 키로만 수행(RLS/스토리지 정책 우회).
-- 사진은 주문내역 화면에서 누구나 볼 수 있어야 하므로 버킷 자체는 public으로 설정.
-- =========================================================

insert into storage.buckets (id, name, public)
values ('delivery-photos', 'delivery-photos', true)
on conflict (id) do nothing;
