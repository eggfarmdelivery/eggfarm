import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  const authUserId = data.session.user.id;

  const { data: existing } = await supabase
    .from("account")
    .select("id, role")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (existing) {
    return NextResponse.redirect(`${origin}/${existing.role}`);
  }

  return NextResponse.redirect(`${origin}/onboarding`);
}
