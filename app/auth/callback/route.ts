import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const intent = searchParams.get("intent") === "login" ? "login" : "signup";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?intent=${intent}&error=auth_failed`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?intent=${intent}&error=auth_failed`);
  }

  const authUserId = data.session.user.id;

  const { data: existing } = await supabase
    .from("account")
    .select("id, role")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (existing) {
    // 이미 가입된 계정 → 회원가입/로그인 어느 버튼으로 왔든 본인 홈으로
    return NextResponse.redirect(`${origin}/${existing.role}`);
  }

  if (intent === "login") {
    // 계정이 없는데 로그인으로 들어온 경우 → 가입 유도
    return NextResponse.redirect(`${origin}/login?intent=signup&error=no_account`);
  }

  // 신규 가입 → 회원유형(B2C/B2B) 선택 + 정보입력 온보딩으로
  return NextResponse.redirect(`${origin}/onboarding`);
}
