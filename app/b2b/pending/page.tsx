export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";
import LogoutButton from "@/app/b2c/mypage/LogoutButton";

export default async function B2BPendingPage() {
  const sessionSupabase = await createClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();
  if (!user) redirect("/");

  const { data: account } = await supabase
    .from("account")
    .select("approval_status, rejection_reason, business_name")
    .eq("auth_user_id", user.id)
    .eq("role", "b2b")
    .maybeSingle();

  if (!account) redirect("/onboarding");
  if (account.approval_status === "approved") redirect("/b2b");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-center">
      {account.approval_status === "pending" && (
        <>
          <div className="mb-4 text-3xl">⏳</div>
          <p className="mb-2 text-base font-medium">승인 대기중이에요</p>
          <p className="text-sm text-neutral-500 leading-relaxed">
            {account.business_name}님의 거래처 정보를 확인한 뒤
            <br />
            에그팜에서 승인해드릴게요
          </p>
        </>
      )}
      {account.approval_status === "rejected" && (
        <>
          <div className="mb-4 text-3xl">😥</div>
          <p className="mb-2 text-base font-medium">가입 신청이 거절됐어요</p>
          {account.rejection_reason && (
            <p className="mb-2 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
              사유: {account.rejection_reason}
            </p>
          )}
          <p className="text-sm text-neutral-500">
            문의사항이 있으시면 에그팜으로 연락해주세요
          </p>
        </>
      )}
      {account.approval_status === "inactive" && (
        <>
          <div className="mb-4 text-3xl">🚫</div>
          <p className="mb-2 text-base font-medium">현재 거래가 중단된 상태예요</p>
          <p className="text-sm text-neutral-500">문의사항이 있으시면 에그팜으로 연락해주세요</p>
        </>
      )}

      <div className="mt-8 w-full max-w-xs">
        <LogoutButton />
      </div>
    </div>
  );
}
