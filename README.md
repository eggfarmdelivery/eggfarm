# 에그팜 (EGG FARM)

계란 B2C(일반배송/정기배송) 배송 플랫폼. (B2B는 UI에서 숨겨둔 상태, 코드는 남아있음)

## 지금 상태 (v24)
카카오 로그인 + 온보딩(주소검색+동/호수 분리입력) + B2C 주문~배송완료 사진까지 전체 흐름 완료.
관리자 상품관리(사진/가격/재고한도 등록·수정) + 콘솔 상태별 탭 구조 추가.
Supabase에 0001~0006 마이그레이션 순서대로 실행 후 테스트 가능.

## 로그인/가입 흐름
- 랜딩(`/`)에 회원가입/로그인 버튼만 있음
- 카카오 인증 후 계정 없으면 `/onboarding`에서 정보입력 → 그 자리에서 가입 완료(승인절차 없음, B2C만 노출)
- 로그인인데 계정 없으면 회원가입으로 자동 안내

## 화면 목록
- `/` 랜딩(회원가입/로그인)
- `/onboarding` 정보입력(이름/전화/주소검색+동호수/공동현관비번)
- `/b2c` 홈, `/b2c/order` 일반배송 주문(수량 +/- 스테퍼), `/b2c/regular` 정기배송(크레딧=원단위 선결제),
  `/b2c/orders` 주문내역(배송완료 사진 표시), `/b2c/mypage`(정보수정+로그아웃)
- `/admin/login` 관리자 로그인, `/admin` 콘솔(B2C/B2B 탭 + 상태별 하위탭, 배송완료 사진 업로드),
  `/admin/products` 상품관리(신규등록/기존수정 구분, 사진·가격·재고한도 즉시반영), `/admin/settlement` B2B정산, `/admin/quotes` 견적문의함
- `/quote` 비회원 견적문의
- (숨김) `/b2b`, `/b2b/order`, `/b2b/orders` — 코드는 있으나 진입경로 없음

## 필요한 환경변수
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (사진 스토리지 업로드용, 서버 전용)
- ADMIN_PASSWORD
- ENTRANCE_ENC_KEY (공동현관 비밀번호 암호화)
- KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET → Supabase 대시보드에 입력(코드엔 불필요)

## 마이그레이션 순서
0001_init → 0002_seed → 0003_auth → 0004_storage → 0005_address_fields → 0006_product_photo → 0007_settings
(0002는 재실행해도 중복 안 생기게 처리됨. 이미 중복 생겼다면 cleanup-duplicates.sql 1회 실행)

## 아직 안 된 것 (다음 순서)
1. 카카오 "나에게 보내기" 알림 (B2B 배송완료/입금확인, 정산 알림) — 실제 발송 로직 미구현
2. 일반배송 배송비 설정(관리자가 무료/유료 선택) 반영
3. 배송가능 단지 관리 화면 — 온보딩이 자유주소 방식으로 바뀌면서 용도 재정리 필요(현재 delivery_zone 테이블은 미사용 상태)
4. 매장QR/프로모션 QR, 배달원 리크루팅 — 백로그
