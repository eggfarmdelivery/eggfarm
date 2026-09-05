// 카카오 로그인(가입/알림 동의 겸용) + "나에게 보내기" 메시지 발송
// 오더모아(groupbuy) lib/kakao.ts 로직 이식 예정
// - 토큰 교환 시 KAKAO_CLIENT_SECRET 필수(카카오 정책, v25~v27 디버깅에서 확인됨)
// - Redirect URI/클라이언트 시크릿은 [앱]→[플랫폼 키]→대표 REST API 키 상세설정에서 등록

export async function sendKakaoMemo(accessToken: string, text: string, linkUrl?: string) {
  // TODO: 오더모아 sendKakaoMemo 이식
}
