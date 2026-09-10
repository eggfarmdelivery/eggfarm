// 관리자용 카카오 "나에게 보내기" 알림 - 새 주문(입금대기) 발생 시 관리자 본인 카톡으로 알려줌
// - 토큰 교환/갱신 시 KAKAO_CLIENT_SECRET 필수(카카오 정책)
// - Redirect URI는 [앱]→[플랫폼 키]→REST API 키 상세설정의 "카카오 로그인 리다이렉트 URI"에 등록 필요
import { supabase } from "@/lib/supabase";

const TOKEN_ROW_ID = "default";

type TokenRow = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

export async function saveAdminKakaoToken(
  accessToken: string,
  refreshToken: string,
  expiresInSeconds: number
) {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  const { error } = await supabase.from("admin_kakao_token").upsert({
    id: TOKEN_ROW_ID,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function isAdminKakaoConnected(): Promise<boolean> {
  const { data } = await supabase
    .from("admin_kakao_token")
    .select("id")
    .eq("id", TOKEN_ROW_ID)
    .maybeSingle();
  return !!data;
}

// 만료 임박(5분 이내)이면 refresh_token으로 갱신 후 최신 access_token 반환
async function getValidAdminAccessToken(): Promise<string | null> {
  const { data } = await supabase
    .from("admin_kakao_token")
    .select("access_token, refresh_token, expires_at")
    .eq("id", TOKEN_ROW_ID)
    .maybeSingle<TokenRow>();
  if (!data) return null;

  const expiresAt = new Date(data.expires_at).getTime();
  if (expiresAt - Date.now() > 5 * 60 * 1000) {
    return data.access_token;
  }

  // 만료 임박 - 갱신
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.KAKAO_REST_API_KEY ?? "",
    client_secret: process.env.KAKAO_CLIENT_SECRET ?? "",
    refresh_token: data.refresh_token,
  });
  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const newAccessToken = json.access_token as string;
  const newRefreshToken = (json.refresh_token as string) ?? data.refresh_token;
  const expiresIn = (json.expires_in as number) ?? 21599;
  await saveAdminKakaoToken(newAccessToken, newRefreshToken, expiresIn);
  return newAccessToken;
}

// 관리자 본인 카톡("나에게 보내기")으로 텍스트 메시지 발송 - 실패해도 조용히 무시(주문 흐름을 막지 않기 위함)
export async function sendKakaoMemoToAdmin(text: string, linkUrl?: string) {
  try {
    const accessToken = await getValidAdminAccessToken();
    if (!accessToken) return;

    const templateObject = {
      object_type: "text",
      text,
      link: {
        web_url: linkUrl ?? "",
        mobile_web_url: linkUrl ?? "",
      },
    };

    const params = new URLSearchParams({
      template_object: JSON.stringify(templateObject),
    });

    await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
  } catch {
    // 알림 실패는 무시 - 주문 자체는 정상 처리되어야 함
  }
}
