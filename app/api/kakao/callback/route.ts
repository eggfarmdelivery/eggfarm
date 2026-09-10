import { NextRequest, NextResponse } from "next/server";
import { setAdminCookie } from "@/lib/adminAuth";
import { saveAdminKakaoToken } from "@/lib/kakao";

// 카카오 인증 후 돌아오는 콜백 - code를 토큰으로 교환하고, 그 계정이 관리자 본인인지
// (ADMIN_KAKAO_ID 환경변수와 대조) 확인한 뒤 관리자 세션 발급 + 알림용 토큰 저장을 함께 처리
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const errorParam = request.nextUrl.searchParams.get("error");
  const origin = request.nextUrl.origin;

  if (errorParam || !code) {
    return NextResponse.redirect(
      `${origin}/admin/login?kakao_error=${encodeURIComponent(errorParam ?? "no_code")}`
    );
  }

  const redirectUri = `${origin}/api/kakao/callback`;
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.KAKAO_REST_API_KEY ?? "",
    client_secret: process.env.KAKAO_CLIENT_SECRET ?? "",
    redirect_uri: redirectUri,
    code,
  });

  try {
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      return NextResponse.redirect(
        `${origin}/admin/login?kakao_error=${encodeURIComponent(
          tokenJson.error_description ?? "token_exchange_failed"
        )}`
      );
    }

    // 이 카카오 계정이 진짜 관리자 본인인지 확인
    const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const meJson = await meRes.json();
    const kakaoUserId = String(meJson.id ?? "");
    const adminKakaoId = process.env.ADMIN_KAKAO_ID;

    if (!adminKakaoId) {
      // 최초 설정 전 - 이 카카오 계정의 id를 알려줘서 환경변수에 등록하게 안내
      return NextResponse.redirect(
        `${origin}/admin/login?kakao_setup_id=${encodeURIComponent(kakaoUserId)}`
      );
    }

    if (kakaoUserId !== adminKakaoId) {
      return NextResponse.redirect(
        `${origin}/admin/login?kakao_error=${encodeURIComponent(
          "이 카카오 계정은 관리자 계정이 아니에요"
        )}`
      );
    }

    await setAdminCookie();
    await saveAdminKakaoToken(
      tokenJson.access_token,
      tokenJson.refresh_token,
      tokenJson.expires_in ?? 21599
    );

    return NextResponse.redirect(`${origin}/admin?kakao_connected=1`);
  } catch (e) {
    return NextResponse.redirect(
      `${origin}/admin/login?kakao_error=${encodeURIComponent(
        e instanceof Error ? e.message : "unknown_error"
      )}`
    );
  }
}
