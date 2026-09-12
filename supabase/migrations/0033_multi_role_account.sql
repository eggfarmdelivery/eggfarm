-- 카카오 로그인 계정 하나가 b2c(개인)와 b2b(사업자) 계정을 동시에 가질 수 있게 완화.
-- 기존엔 auth_user_id 단독 unique라서 계정당 1개 역할만 가능했음.
-- 제약 이름을 확신할 수 없어서(자동생성된 이름일 수 있음) pg_constraint에서 직접 찾아서 지움
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'account'::regclass
    and contype = 'u'
    and conkey = array[(select attnum from pg_attribute where attrelid = 'account'::regclass and attname = 'auth_user_id')];
  if cname is not null then
    execute format('alter table account drop constraint %I', cname);
  end if;
end $$;

create unique index if not exists account_auth_user_id_role_key on account (auth_user_id, role);
