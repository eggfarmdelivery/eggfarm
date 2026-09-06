import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const role = searchParams.get("role") === "b2b" ? "b2b" : "b2c";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?role=${role}&error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?role=${role}&error=auth_failed`);
  }

  const authUserId = data.session.user.id;
  const kakaoUserId = data.session.user.user_metadata?.provider_id ?? null;

  const { data: existing } = await supabase
    .from("account")
    .select("id")
    .eq("auth_user_id", authUserId)
    .eq("role", role)
    .maybeSingle();

  if (existing) {
    return NextResponse.redirect(`${origin}/${role}`);
  }

  if (role === "b2c") {
    // B2C는 최초 로그인 시 온보딩(정보입력)으로 보냄 — 계정은 온보딩 제출 시 생성
    return NextResponse.redirect(`${origin}/onboarding?kakao_user_id=${kakaoUserId ?? ""}`);
  }

  // B2B는 관리자가 미리 만들어둔 계정에, 카카오 인증정보로 연동전화번호를 매칭해 연결
  // 주의: 카카오 로그인에서 전화번호(phone_number) 항목은 카카오 심사를 거쳐 추가 동의항목으로
  // 승인받아야 받아올 수 있어요. 심사 전까지는 이 분기가 항상 no_phone으로 빠질 수 있음
  // (심사 전 임시 대안: /admin에서 거래처별로 auth_user_id를 수동 매칭해주는 화면을 따로 만들 수 있음)
  const phone = data.session.user.user_metadata?.phone_number ?? null;
  if (!phone) {
    return NextResponse.redirect(`${origin}/login?role=b2b&error=no_phone`);
  }

  const admin = createAdminClient();
  const { data: b2bAccount } = await admin
    .from("account")
    .select("id")
    .eq("role", "b2b")
    .eq("phone", phone)
    .is("auth_user_id", null)
    .maybeSingle();

  if (!b2bAccount) {
    return NextResponse.redirect(`${origin}/login?role=b2b&error=not_registered`);
  }

  await admin.from("account").update({ auth_user_id: authUserId }).eq("id", b2bAccount.id);

  return NextResponse.redirect(`${origin}/b2b`);
}
