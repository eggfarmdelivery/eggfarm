import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingB2BClient from "./OnboardingB2BClient";

export default async function OnboardingB2BPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?role=b2b&intent=signup");

  return (
    <div className="px-5 py-8">
      <h1 className="mb-1 text-lg font-medium">거래처 정보 입력</h1>
      <p className="mb-6 text-sm text-neutral-500">발주에 필요한 정보를 입력해주세요</p>
      <OnboardingB2BClient />
    </div>
  );
}
