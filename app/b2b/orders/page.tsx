export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { getApprovedB2BAccountId } from "@/lib/getAccount";
import OrderCard from "./OrderCard";

export default async function B2BOrdersPage() {
  const accountId = await getApprovedB2BAccountId();

  const { data: orders } = await supabase
    .from("b2b_order")
    .select(
      "id, status, total_amount, delivery_photo_url, desired_delivery_date, created_at, b2b_order_item(quantity, original_quantity, adjusted, product(name))"
    )
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  return (
    <div className="pb-10">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">배송 현황</h1>
      </header>

      <main className="px-5">
        {(!orders || orders.length === 0) && (
          <p className="py-10 text-center text-sm text-neutral-400">
            발주 내역이 없어요
          </p>
        )}

        <div className="space-y-3">
          {orders?.map((o) => (
            <OrderCard key={o.id} order={o as any} />
          ))}
        </div>
      </main>
    </div>
  );
}
