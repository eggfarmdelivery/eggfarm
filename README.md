# 에그팜 (EGG FARM)

계란 B2C(일반배송/정기배송) + B2B(건바이건 발주) 통합 배송 플랫폼.

## 지금 상태 (v10)
카카오 로그인 + 통합 회원가입(회원유형 선택) + B2C 주문~배송완료 사진까지 전체 흐름 완료.
Supabase에 0001_init.sql → 0002_seed.sql → 0003_auth.sql → 0004_storage.sql 순서로 실행 후 테스트 가능.

## 로그인/가입 흐름
- 랜딩(`/`)에 회원가입/로그인 버튼만 있음(B2C·B2B 구분 없음)
- 카카오 인증 후 계정 없으면 `/onboarding`에서 회원유형(B2C/B2B) 선택 + 정보입력 → 그 자리에서 가입 완료(승인절차 없음)
- 로그인인데 계정 없으면 회원가입으로 자동 안내, 반대로 이미 가입된 사람이 회원가입 눌러도 바로 홈으로

## 화면 목록
- `/` 랜딩(회원가입/로그인)
- `/onboarding` 회원유형 선택 + 정보입력(공용)
- `/b2c` 홈, `/b2c/order` 일반배송 주문, `/b2c/regular` 정기배송(크레딧=원단위 선결제),
  `/b2c/orders` 주문내역(배송완료 사진 표시), `/b2c/mypage`(개인정보+로그아웃)
- `/b2b` 홈, `/b2b/order` 발주, `/b2b/orders` 배송현황
- `/admin/login` 관리자 로그인(환경변수 ADMIN_PASSWORD), `/admin` 콘솔(배송완료 사진 실제 업로드),
  `/admin/limits` 재고/한도설정, `/admin/settlement` B2B정산, `/admin/quotes` 견적문의함
- `/quote` 비회원 견적문의

## 필요한 환경변수
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (B2C/B2B 배송완료 사진 스토리지 업로드용, 서버 전용)
- ADMIN_PASSWORD
- ENTRANCE_ENC_KEY (공동현관 비밀번호 암호화, `openssl rand -base64 32`로 생성)
- KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET → Supabase 대시보드(Authentication > Providers > Kakao)에 입력(코드에는 불필요)

## 아직 안 된 것 (다음 순서)
1. 카카오 "나에게 보내기" 알림 (B2B 배송완료/입금확인, 정산 알림) — 실제 발송 로직 미구현
2. 일반배송 배송비 설정(관리자가 무료/유료 선택) 반영
3. 매장QR/프로모션 QR, 배달원 리크루팅 — 이번 범위 제외, 백로그

## 시드 데이터 (0002_seed.sql)
상품 3종(왕란/특란/대란), 배송단지 1개, 오늘자 재고한도(100판/초과30%/인당2판) 기본값을 넣어둡니다.
테스트 후 관리자 화면(/admin/limits)에서 값 조정 가능.

