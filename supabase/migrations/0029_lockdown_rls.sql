-- 보안 정비: 앱 서버 코드가 이제 서비스롤 키로 동작하므로(lib/supabase.ts 변경),
-- 모든 운영 테이블에 RLS를 걸어 공개 anon key로는 직접 읽기/쓰기가 전혀 안 되게 막음.
-- (정책을 하나도 안 붙이면 anon/authenticated 롤은 기본적으로 전부 거부됨 - 서비스롤은 RLS 자체를 우회하므로 서버 코드는 그대로 동작함)
-- account 테이블은 0003_auth.sql에서 이미 RLS+정책이 설정돼 있으므로 손대지 않음(세션 기반 접근 유지)

alter table system_config enable row level security;
alter table delivery_zone enable row level security;
alter table product enable row level security;
alter table price_history enable row level security;
alter table b2b_account_price enable row level security;
alter table b2b_price_history enable row level security;
alter table product_limit_schedule enable row level security;
alter table credit_ledger enable row level security;
alter table b2c_order enable row level security;
alter table b2c_order_item enable row level security;
alter table b2b_order enable row level security;
alter table b2b_order_item enable row level security;
alter table b2b_settlement enable row level security;
alter table quote_request enable row level security;
alter table courier enable row level security;
alter table courier_zone enable row level security;
alter table courier_settlement enable row level security;
alter table courier_deposit_ledger enable row level security;

-- 이전에 "임시로" 꺼뒀던 테이블들 다시 켜기 (서비스롤로 전환됐으니 이제 문제없이 동작해야 함)
alter table order_status_log enable row level security;
alter table campaign enable row level security;
alter table campaign_product enable row level security;
alter table campaign_zone enable row level security;
alter table admin_kakao_token enable row level security;
