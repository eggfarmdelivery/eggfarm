import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { saveAdminKakaoToken } from "@/lib/kakao";

// 카카오 인증 후 돌아오는 콜백 - code를 토큰으로 교환해서 저장
export async function GET(request: NextRequest) {
  await requireAdmin();

  const code = request.nextUrl.searchParams.get("code");
  const errorParam = request.nextUrl.searchParams.get("error");
  const origin = request.nextUrl.origin;

  if (errorParam || !code) {
    return NextResponse.redirect(
      `${origin}/admin/settings?kakao_error=${encodeURIComponent(errorParam ?? "no_code")}`
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
    const res = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const json = await res.json();
    if (!res.ok || !json.access_token) {
      return NextResponse.redirect(
        `${origin}/admin/settings?kakao_error=${encodeURIComponent(
          json.error_description ?? "token_exchange_failed"
        )}`
      );
    }

    await saveAdminKakaoToken(json.access_token, json.refresh_token, json.expires_in ?? 21599);
    return NextResponse.redirect(`${origin}/admin/settings?kakao_connected=1`);
  } catch (e) {
    return NextResponse.redirect(
      `${origin}/admin/settings?kakao_error=${encodeURIComponent(
        e instanceof Error ? e.message : "unknown_error"
      )}`
    );
  }
}
