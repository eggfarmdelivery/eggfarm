export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import BottomNav from "@/components/BottomNav";
import OrdersClient from "./OrdersClient";

export default async function B2COrdersPage() {
  const accountId = await getAccountId("b2c");

  const { data: orders } = await supabase
    .from("b2c_order")
    .select(
      "id, order_type, status, total_amount, delivery_photo_url, created_at, b2c_order_item(quantity, product(name))"
    )
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  return (
    <div className="pb-28">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">주문내역</h1>
      </header>

      <OrdersClient orders={(orders as any) ?? []} />

      <BottomNav active="/b2c/orders" />
    </div>
  );
}
