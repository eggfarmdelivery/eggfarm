import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const incomingError = searchParams.get("error");
  const incomingErrorDescription = searchParams.get("error_description");

  if (incomingError) {
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(incomingError)}&detail=${encodeURIComponent(
        incomingErrorDescription ?? ""
      )}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=no_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return NextResponse.redirect(
      `${origin}/?error=exchange_failed&detail=${encodeURIComponent(error?.message ?? "")}`
    );
  }

  const authUserId = data.session.user.id;

  // 한 카카오 계정이 b2c/b2b 계정을 동시에 가질 수 있어서, 단일행 가정(maybeSingle)은 안 됨
  const { data: existingAccounts, error: lookupError } = await supabase
    .from("account")
    .select("id, role")
    .eq("auth_user_id", authUserId);

  if (lookupError) {
    return NextResponse.redirect(
      `${origin}/?error=lookup_failed&detail=${encodeURIComponent(lookupError.message)}`
    );
  }

  if (!existingAccounts || existingAccounts.length === 0) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }
  if (existingAccounts.length === 1) {
    return NextResponse.redirect(`${origin}/${existingAccounts[0].role}`);
  }
  // b2c/b2b 계정을 둘 다 가진 경우 - 어느 쪽으로 들어갈지 선택하게 함
  return NextResponse.redirect(`${origin}/choose-role`);
}
