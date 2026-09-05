-- =========================================================
-- 에그팜(EGG FARM) 초기 스키마
-- B2C(일반배송/정기배송) + B2B(건바이건 발주) + 관리자
-- =========================================================

create type order_status as enum (
  '입금대기','입금확인완료','배송위임','배송중','배송완료','초과승인대기','승인거절','취소'
);

create type b2b_order_status as enum (
  '발주요청','배송중','배송완료','입금대기','입금확인완료','취소'
);

create type courier_status as enum ('지원','승인','계약종료');

-- ---------------------------------------------------------
-- 전역 설정
-- ---------------------------------------------------------
create table system_config (
  key text primary key,
  value text not null
);
insert into system_config (key, value) values
  ('daily_order_deadline', '15:00');  -- B2B 발주 접수 마감(평일 매일, 전 거래처 공통)

-- ---------------------------------------------------------
-- 배송가능 단지 (B2C 전용)
-- ---------------------------------------------------------
create table delivery_zone (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 계정 (카카오 로그인 기반, B2C/B2B 공용 테이블 + role 구분)
-- ---------------------------------------------------------
create table account (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('b2c','b2b')),
  kakao_user_id text not null unique,
  name text,
  phone text,
  kakao_access_token text,
  kakao_refresh_token text,
  -- B2C 전용
  delivery_zone_id uuid references delivery_zone(id),
  -- B2B 전용
  business_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 상품 (계란 5종 내외, 단위는 "판" 고정)
-- ---------------------------------------------------------
create table product (
  id uuid primary key default gen_random_uuid(),
  name text not null,               -- 왕란/특란/대란 등
  base_price integer not null,      -- 기본 단가(원/판, B2C용)
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 가격 변경 이력 (기본 단가)
create table price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references product(id),
  price integer not null,
  effective_date date not null,
  created_at timestamptz not null default now()
);

-- 거래처별 계약단가 (B2B)
create table b2b_account_price (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references account(id),
  product_id uuid not null references product(id),
  price integer not null,
  unique (account_id, product_id)
);

-- 거래처별 계약단가 변경 이력
create table b2b_price_history (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references account(id),
  product_id uuid not null references product(id),
  price integer not null,
  effective_date date not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 재고/인당 한도 (B2C+B2B 공통 적용, 예약설정 가능)
-- 조회시점 기준 "적용일자 <= 오늘" 중 가장 최근 값을 사용
-- ---------------------------------------------------------
create table product_limit_schedule (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references product(id),
  effective_date date not null,
  stock_limit integer not null,        -- 기준 재고(판)
  overflow_rate numeric not null default 0.3,  -- 초과허용비율(기본 30%)
  per_person_limit integer,            -- 1인당 최대 구매(판), null=제한없음
  created_at timestamptz not null default now(),
  unique (product_id, effective_date)
);

-- ---------------------------------------------------------
-- B2C 정기배송 크레딧
-- ---------------------------------------------------------
create table credit_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references account(id),
  delta integer not null,        -- 구매시 +, 배송차감시 -
  reason text not null,          -- '구매' / '배송차감' / '환불' 등
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- B2C 주문 (일반배송 + 정기배송 공용)
-- ---------------------------------------------------------
create table b2c_order (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references account(id),
  order_type text not null check (order_type in ('일반','정기')),
  status order_status not null default '입금대기',
  is_overflow boolean not null default false,  -- 기준재고 초과분 여부(승인대기 대상)
  approved_at timestamptz,
  delivery_photo_url text,
  delivery_completed_at timestamptz,
  payment_confirmed_at timestamptz,
  total_amount integer not null default 0,     -- 정기배송은 0(크레딧 차감이므로)
  created_at timestamptz not null default now()
);

create table b2c_order_item (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references b2c_order(id) on delete cascade,
  product_id uuid not null references product(id),
  quantity integer not null,
  unit_price integer not null,   -- 주문시점 스냅샷
  subtotal integer not null
);

-- ---------------------------------------------------------
-- B2B 주문 (건바이건, 선배송후정산)
-- ---------------------------------------------------------
create table b2b_order (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references account(id),
  status b2b_order_status not null default '발주요청',
  delivery_photo_url text,
  delivery_completed_at timestamptz,
  payment_confirmed_at timestamptz,
  total_amount integer not null default 0,
  created_at timestamptz not null default now()
);

create table b2b_order_item (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references b2b_order(id) on delete cascade,
  product_id uuid not null references product(id),
  quantity integer not null,     -- 판 단위
  unit_price integer not null,   -- 거래처 계약단가 스냅샷
  subtotal integer not null
);

-- ---------------------------------------------------------
-- B2B 월별 정산 (익월초 마감, 계좌이체, 미수금 없음)
-- ---------------------------------------------------------
create table b2b_settlement (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references account(id),
  settlement_month date not null,     -- 예: 2026-09-01 (9월분)
  total_amount integer not null,
  status text not null default '대기' check (status in ('대기','이체완료')),
  detail_token text not null default encode(gen_random_bytes(16),'hex'),
  transferred_at timestamptz,
  created_at timestamptz not null default now(),
  unique (account_id, settlement_month)
);

-- ---------------------------------------------------------
-- 견적 문의 (비회원)
-- ---------------------------------------------------------
create table quote_request (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_phone text not null,
  content text not null,
  status text not null default '신규' check (status in ('신규','회신완료')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- [백로그] 배달원(알바) 리크루팅 — 나중에 적용
-- ---------------------------------------------------------
create table courier (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  status courier_status not null default '지원',
  created_at timestamptz not null default now()
);

create table courier_zone (
  courier_id uuid not null references courier(id),
  delivery_zone_id uuid not null references delivery_zone(id) unique, -- 단지당 1명
  assigned_at timestamptz not null default now(),
  primary key (courier_id, delivery_zone_id)
);

create table courier_settlement (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid not null references courier(id),
  settlement_month date not null,
  total_fee integer not null,
  paid_amount integer not null,      -- 80%
  reserved_amount integer not null,  -- 20% 유보
  created_at timestamptz not null default now()
);

create table courier_deposit_ledger (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid not null references courier(id),
  delta integer not null,           -- 적립 +, 퇴사정산 -
  reason text not null,
  created_at timestamptz not null default now()
);
