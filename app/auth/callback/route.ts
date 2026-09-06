import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const role = searchParams.get("role") === "b2b" ? "b2b" : "b2c";
  const intent = searchParams.get("intent") === "login" ? "login" : "signup";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?role=${role}&intent=${intent}&error=auth_failed`
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return NextResponse.redirect(
      `${origin}/login?role=${role}&intent=${intent}&error=auth_failed`
    );
  }

  const authUserId = data.session.user.id;

  const { data: existing } = await supabase
    .from("account")
    .select("id")
    .eq("auth_user_id", authUserId)
    .eq("role", role)
    .maybeSingle();

  if (existing) {
    // 이미 가입된 계정 → 로그인이든 회원가입 버튼으로 왔든 바로 홈으로
    const suffix = intent === "signup" ? "?notice=already_registered" : "";
    return NextResponse.redirect(`${origin}/${role}${suffix}`);
  }

  // 계정이 없는데 "로그인"으로 들어온 경우 → 가입 유도하고 되돌림
  if (intent === "login") {
    return NextResponse.redirect(
      `${origin}/login?role=${role}&intent=signup&error=no_account`
    );
  }

  // 회원가입 → 역할별 온보딩(추가정보 입력)으로
  const onboardingPath = role === "b2b" ? "/onboarding/b2b" : "/onboarding";
  return NextResponse.redirect(`${origin}${onboardingPath}`);
}
