-- 닉네임(입금자명용) 컬럼 추가 - 실명(name)과 별개, 중복 허용(고유성은 뒷4자리 결합으로 확보)
alter table account add column if not exists nickname text;
