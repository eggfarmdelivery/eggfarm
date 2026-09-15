export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { getApprovedB2BAccountId } from "@/lib/getAccount";
import OrderCard from "./OrderCard";

const EDITABLE_STATUSES = ["발주요청", "승인대기"];

export default async function B2BOrdersPage() {
  const accountId = await getApprovedB2BAccountId();

  const { data: orders } = await supabase
    .from("b2b_order")
    .select(
      "id, status, total_amount, delivery_photo_url, payment_method, desired_delivery_date, created_at, b2b_order_item(id, product_id, quantity, original_quantity, adjusted, unit_price, product(name))"
    )
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  const { data: bankInfo } = await supabase
    .from("system_config")
    .select("key, value")
    .in("key", ["bank_name", "bank_account", "bank_holder"]);
  const bank = Object.fromEntries((bankInfo ?? []).map((c) => [c.key, c.value]));

  const { data: myPrices } = await supabase
    .from("b2b_account_price")
    .select("product_id, price, product(name)")
    .eq("account_id", accountId);

  const ordersWithAddable = (orders ?? []).map((o) => {
    if (!EDITABLE_STATUSES.includes(o.status)) return { ...o, addableProducts: [] };
    const existingIds = new Set((o.b2b_order_item ?? []).map((i: any) => i.product_id));
    const addableProducts = (myPrices ?? [])
      .filter((p) => !existingIds.has(p.product_id))
      .map((p) => ({
        productId: p.product_id,
        productName: (p.product as any)?.name ?? "상품",
        price: p.price,
      }));
    return { ...o, addableProducts };
  });

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
          {ordersWithAddable.map((o) => (
            <OrderCard key={o.id} order={o as any} bankInfo={bank} />
          ))}
        </div>
      </main>
    </div>
  );
}
