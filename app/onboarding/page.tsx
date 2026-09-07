import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/?error=no_session&detail=onboarding_could_not_read_cookie");

  return (
    <div className="px-5 py-8">
      <h1 className="mb-1 text-lg font-medium">회원정보 입력</h1>
      <p className="mb-6 text-sm text-neutral-500">
        배송에 필요한 정보를 입력해주세요
      </p>
      <OnboardingClient />
    </div>
  );
}
