-- B2B 확장: 사업자 가입/승인, 발주 결제수단·희망배송일·수량조정, 견적문의 답글/거절, 계산서 발행 희망
-- 기존 계정(B2C 전부 + 기존 B2B)은 승인 개념이 없었으므로 default를 'approved'로 둬서
-- 하위호환 유지, 신규 B2B 가입만 애플리케이션에서 명시적으로 'pending'으로 넣음
alter table account add column if not exists business_number text;
alter table account add column if not exists business_type text; -- 개인사업자-일반과세자 / 개인사업자-간이과세자 / 법인사업자 / 면세사업자
alter table account add column if not exists approval_status text not null default 'approved'
  check (approval_status in ('pending','approved','rejected','inactive'));
alter table account add column if not exists rejection_reason text;
alter table account add column if not exists admin_note text;
alter table account add column if not exists tax_invoice_needed boolean not null default false;
-- 배송동선 계산용 좌표 (카카오 로컬 API로 지오코딩해서 채움, 실패시 null 허용)
alter table account add column if not exists latitude double precision;
alter table account add column if not exists longitude double precision;

alter table b2b_order add column if not exists payment_method text check (payment_method in ('계좌이체','현금'));
alter table b2b_order add column if not exists desired_delivery_date date;

alter table b2b_order_item add column if not exists adjusted boolean not null default false;
alter table b2b_order_item add column if not exists original_quantity integer;

alter table quote_request add column if not exists email text;
alter table quote_request add column if not exists admin_reply text;
alter table quote_request add column if not exists replied_at timestamptz;
alter table quote_request drop constraint if exists quote_request_status_check;
alter table quote_request add constraint quote_request_status_check check (status in ('신규','회신완료','거절'));
