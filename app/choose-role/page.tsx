export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ChooseRolePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: accounts } = await supabase
    .from("account")
    .select("role, business_name")
    .eq("auth_user_id", user.id);

  if (!accounts || accounts.length === 0) redirect("/onboarding");
  if (accounts.length === 1) redirect(`/${accounts[0].role}`);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="mb-2 text-base font-medium">어느 계정으로 들어가시겠어요?</p>
      <div className="w-full max-w-xs space-y-2">
        <Link
          href="/b2c"
          className="block w-full rounded-lg border border-neutral-300 py-3 text-sm font-medium"
        >
          일반회원으로 계속하기
        </Link>
        <Link
          href="/b2b"
          className="block w-full rounded-lg border border-neutral-300 py-3 text-sm font-medium"
        >
          사업자회원으로 계속하기
        </Link>
      </div>
    </div>
  );
}
