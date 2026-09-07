export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import BottomNav from "@/components/BottomNav";
import RegularClient from "./RegularClient";

export default async function RegularOrderPage() {
  const accountId = await getAccountId("b2c");

  const { data: ledger } = await supabase
    .from("credit_ledger")
    .select("delta")
    .eq("account_id", accountId);
  const credit = (ledger ?? []).reduce((s, r) => s + r.delta, 0);

  const { data: products } = await supabase
    .from("product")
    .select("id, name, base_price")
    .eq("is_active", true)
    .order("base_price", { ascending: false });

  return (
    <div className="pb-32">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/b2c" aria-label="뒤로가기">
          ←
        </Link>
        <h1 className="text-base font-medium">정기배송</h1>
      </header>
      <RegularClient products={products ?? []} credit={credit} />
      <BottomNav active="/b2c" />
    </div>
  );
}
