export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/getAccount";
import { isSoldOut } from "@/lib/limits";
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
    (products ?? []).map(async (p) => ({ ...p, soldOut: await isSoldOut(p.id) }))
  );

  const { data: account } = await sessionSupabase
    .from("account")
    .select("address")
    .eq("id", accountId)
    .single();

  return (
    <div className="pb-28">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/b2c" aria-label="뒤로가기">
          ←
        </Link>
        <h1 className="text-base font-medium">일반배송 주문</h1>
      </header>

      <OrderForm products={productsWithStock} address={account?.address ?? null} />
      <BottomNav active="/b2c" />
    </div>
  );
}
