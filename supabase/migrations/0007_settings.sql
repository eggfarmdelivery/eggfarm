-- 입금계좌 정보 + 카카오 오픈채팅 문의 URL 등 운영 설정값 추가
insert into system_config (key, value) values
  ('bank_name', ''),
  ('bank_account', ''),
  ('bank_holder', ''),
  ('kakao_openchat_url', '')
on conflict (key) do nothing;
