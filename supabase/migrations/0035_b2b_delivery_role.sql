-- B2B 배송 담당 권한 추가
alter table admin_staff drop constraint if exists admin_staff_permission_check;
alter table admin_staff add constraint admin_staff_permission_check
  check (permission in ('payment', 'delivery', 'b2b_delivery'));
