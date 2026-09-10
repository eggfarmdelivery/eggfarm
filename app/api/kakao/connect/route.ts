import { NextRequest, NextResponse } from "next/server";

// 관리자 카카오 로그인/"나에게 보내기" 연동 시작점 - 두 가지 진입 경로가 여기로 옴:
// 1) 관리자 로그인 화면의 "카카오로 로그인" (아직 관리자 세션 없음)
// 2) 관리자 설정화면의 "카카오 나에게 보내기 연동하기"(이미 관리자 세션 있음)
// 어느 쪽이든 콜백에서 카카오 계정 본인확인(ADMIN_KAKAO_ID) 후 처리하므로 여기선 admin 체크 안 함
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/kakao/callback`;
  const clientId = process.env.KAKAO_REST_API_KEY ?? "";

  const authorizeUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "talk_message");

  return NextResponse.redirect(authorizeUrl.toString());
}
