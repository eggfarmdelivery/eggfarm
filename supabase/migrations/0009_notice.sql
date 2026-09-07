-- 홈화면 공지사항 배너
insert into system_config (key, value) values
  ('notice_enabled', 'false'),
  ('notice_text', '')
on conflict (key) do nothing;
