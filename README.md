# 에그팜 (EGG FARM)

계란 B2C(일반배송/정기배송) + B2B(건바이건 발주) 통합 배송 플랫폼.

## 지금 상태 (v5)
전 화면 코드 작성 완료, 로그인은 아직 미구현(카카오 로그인 전까지 "데모 계정"으로 자동 동작).
Supabase에 0001_init.sql + 0002_seed.sql 실행 후 바로 테스트 가능.

## 화면 목록
- `/` 랜딩
- `/b2c` 홈, `/b2c/order` 일반배송 주문, `/b2c/regular` 정기배송(크레딧),
  `/b2c/orders` 주문내역, `/b2c/mypage` 마이페이지
- `/b2b` 로그인(테스트용 바로진입), `/b2b/order` 발주, `/b2b/orders` 배송현황
- `/admin/login` 관리자 로그인(환경변수 ADMIN_PASSWORD), `/admin` 콘솔,
  `/admin/limits` 재고/한도설정, `/admin/settlement` B2B정산, `/admin/quotes` 견적문의함
- `/quote` 비회원 견적문의

## 필요한 환경변수
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ADMIN_PASSWORD
(카카오 관련 KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET은 로그인 연동 붙일 때 추가)

## 아직 안 된 것 (다음 순서)
1. 카카오 로그인 실제 연동 (지금은 lib/demoAccount.ts로 임시 대체 — 로그인 붙으면 이 파일 삭제하고 세션에서 account_id 가져오도록 교체)
2. 카카오 "나에게 보내기" 알림 (B2B 배송완료/입금확인, 정산 알림)
3. 배송위임/배송완료 사진 실제 업로드(지금은 URL 직접입력 prompt로 임시 대체)
4. 매장QR/프로모션 QR, 배달원 리크루팅 — 이번 범위 제외, 백로그

## 시드 데이터 (0002_seed.sql)
상품 3종(왕란/특란/대란), 배송단지 1개, 오늘자 재고한도(100판/초과30%/인당2판) 기본값을 넣어둡니다.
테스트 후 관리자 화면(/admin/limits)에서 값 조정 가능.
