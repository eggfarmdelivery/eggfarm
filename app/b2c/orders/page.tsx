export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import OrderJourney from "@/components/OrderJourney";
import BottomNav from "@/components/BottomNav";

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

      <main className="px-5">
        {(!orders || orders.length === 0) && (
          <p className="py-10 text-center text-sm text-neutral-400">
            아직 주문 내역이 없어요
          </p>
        )}

        <div className="space-y-3">
          {orders?.map((o) => (
            <div key={o.id} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{o.order_type}배송</span>
                <OrderStatusBadge status={o.status} />
              </div>
              <p className="text-xs text-neutral-500 mb-1">
                {(o.b2c_order_item ?? [])
                  .map((i: any) => `${i.product?.name} ${i.quantity}판`)
                  .join(" · ")}
              </p>
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>{new Date(o.created_at).toLocaleDateString("ko-KR")}</span>
                {o.order_type === "일반" && (
                  <span>{o.total_amount.toLocaleString()}원</span>
                )}
              </div>
              <div className="mt-3 border-t border-neutral-100 pt-2">
                <OrderJourney status={o.status} />
              </div>
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

      <BottomNav active="/b2c/orders" />
    </div>
  );
}
