import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

// 관리자가 "카카오 나에게 보내기" 연동 버튼을 누르면 여기로 와서 카카오 인증화면으로 보냄
export async function GET(request: NextRequest) {
  await requireAdmin();

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
