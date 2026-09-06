export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/getAccount";

export default async function B2BHome() {
  const accountId = await getAccountId("b2b");
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("account")
    .select("business_name")
    .eq("id", accountId)
    .single();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-primary-bg p-6 text-center">
      <img src="/logo.png" alt="에그팜" className="h-8 w-auto" />
      <p className="text-sm text-primary-dark">{account?.business_name ?? "거래처"}님</p>

      <div className="w-full max-w-xs space-y-2">
        <Link
          href="/b2b/order"
          className="block w-full rounded-lg bg-[#3D2E1A] py-3 text-sm font-medium text-white"
        >
          발주하기
        </Link>
        <Link
          href="/b2b/orders"
          className="block w-full rounded-lg border border-neutral-300 py-3 text-sm font-medium"
        >
          배송 현황
        </Link>
      </div>
    </div>
  );
}
