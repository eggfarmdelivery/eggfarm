export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/getAccount";
import { isSoldOut, getCurrentLimit } from "@/lib/limits";
import { getConfigs } from "@/lib/settings";
import BottomNav from "@/components/BottomNav";
import OrderForm from "./OrderForm";

export default async function GeneralOrderPage() {
  const accountId = await getAccountId("b2c");
  const sessionSupabase = await createClient();

  const { data: products } = await supabase
    .from("product")
    .select("id, name, base_price")
    .eq("is_active", true)
    .order("base_price", { ascending: false });

  const productsWithStock = await Promise.all(
    (products ?? []).map(async (p) => {
      const limit = await getCurrentLimit(p.id);
      return {
        ...p,
        soldOut: await isSoldOut(p.id),
        perPersonLimit: limit?.per_person_limit ?? null,
      };
    })
  );

  const { data: account } = await sessionSupabase
    .from("account")
    .select("address")
    .eq("id", accountId)
    .single();

  const bankInfo = await getConfigs(["bank_name", "bank_account", "bank_holder"]);

  return (
    <div className="pb-32">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/b2c" aria-label="뒤로가기">
          ←
        </Link>
        <h1 className="text-base font-medium">일반배송 주문</h1>
      </header>

      <OrderForm
        products={productsWithStock}
        address={account?.address ?? null}
        bankInfo={bankInfo}
      />
      <BottomNav active="/b2c" />
    </div>
  );
}
