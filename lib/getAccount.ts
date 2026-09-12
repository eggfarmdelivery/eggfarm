import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getAccountId(role: "b2c" | "b2b"): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/?error=no_session&detail=getAccountId_could_not_read_cookie");

  const { data: account } = await supabase
    .from("account")
    .select("id")
    .eq("auth_user_id", user.id)
    .eq("role", role)
    .maybeSingle();

  if (!account) {
    redirect("/onboarding");
  }

  return account.id as string;
}

// B2B는 승인된 거래처만 발주 화면 등을 쓸 수 있어야 해서, 승인 상태까지 체크하는 전용 게이트.
// 승인대기/거절/비활성 상태면 /b2b/pending 으로 보내서 그 화면에서 상태별 안내를 함
export async function getApprovedB2BAccountId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/?error=no_session&detail=getApprovedB2BAccountId_could_not_read_cookie");

  const { data: account } = await supabase
    .from("account")
    .select("id, approval_status")
    .eq("auth_user_id", user.id)
    .eq("role", "b2b")
    .maybeSingle();

  if (!account) redirect("/onboarding");
  if (account.approval_status !== "approved") redirect("/b2b/pending");

  return account.id as string;
}
