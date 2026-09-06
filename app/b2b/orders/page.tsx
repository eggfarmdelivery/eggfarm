export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import OrderStatusBadge from "@/components/OrderStatusBadge";

export default async function B2BOrdersPage() {
  const accountId = await getAccountId("b2b");

  const { data: orders } = await supabase
    .from("b2b_order")
    .select(
      "id, status, total_amount, delivery_photo_url, created_at, b2b_order_item(quantity, product(name))"
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
            <div key={o.id} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {o.total_amount.toLocaleString()}원
                </span>
                <OrderStatusBadge status={o.status} />
              </div>
              <p className="text-xs text-neutral-500 mb-1">
                {(o.b2b_order_item ?? [])
                  .map((i: any) => `${i.product?.name} ${i.quantity}판`)
                  .join(" · ")}
              </p>
              <p className="text-xs text-neutral-400">
                {new Date(o.created_at).toLocaleDateString("ko-KR")}
              </p>
              {o.delivery_photo_url && (
                <img
                  src={o.delivery_photo_url}
                  alt="배송완료 사진"
                  className="mt-3 rounded-lg w-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
