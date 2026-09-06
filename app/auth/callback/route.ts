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

  const { data: existing, error: lookupError } = await supabase
    .from("account")
    .select("id, role")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.redirect(
      `${origin}/?error=lookup_failed&detail=${encodeURIComponent(lookupError.message)}`
    );
  }

  if (existing) {
    return NextResponse.redirect(`${origin}/${existing.role}`);
  }

  return NextResponse.redirect(`${origin}/onboarding`);
}
