export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { getCampaignProductLimits, getCampaignSold } from "@/lib/campaign";
import { getConfigs } from "@/lib/settings";
import { getSchedule } from "@/lib/schedule";
import { getPersonQtyForDate } from "@/lib/stock";
import BottomNav from "@/components/BottomNav";
import OrdersClient from "./OrdersClient";

// 상시운영 주문: 전체 재고 풀과 배송일 합산 한도로 수량 상한을 계산
async function withAlwaysOpenLimits(order: any, accountId: string) {
  const schedule = await getSchedule();
  const { data: products } = await supabase
    .from("product")
    .select("id, name, base_price, stock_qty")
    .eq("is_active", true);
  const stockMap = new Map((products ?? []).map((p) => [p.id, Math.max(0, p.stock_qty ?? 0)]));
  const orderItems: any[] = order.b2c_order_item ?? [];
  const orderTotal = orderItems.reduce((s, i) => s + i.quantity, 0);
  const others =
    schedule.perPersonLimit > 0 && order.delivery_date
      ? await getPersonQtyForDate(accountId, order.delivery_date, order.id)
      : 0;
  const limitLeftForOrder =
    schedule.perPersonLimit > 0 ? Math.max(0, schedule.perPersonLimit - others) : Infinity;

  const items = orderItems.map((item) => {
    const byStock = (stockMap.get(item.product_id) ?? 0) + item.quantity;
    const byLimit =
      limitLeftForOrder === Infinity ? Infinity : limitLeftForOrder - (orderTotal - item.quantity);
    const maxQty = Math.max(item.quantity, Math.min(byStock, byLimit));
    return {
      ...item,
      maxQty,
      perPersonLimit: byLimit !== Infinity && byLimit < byStock ? maxQty : null,
    };
  });

  const existingIds = new Set(orderItems.map((i) => i.product_id));
  const addableProducts = (products ?? [])
    .filter((p) => !existingIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      base_price: p.base_price,
      remainingStock: Math.max(
        0,
        Math.min(
          stockMap.get(p.id) ?? 0,
          limitLeftForOrder === Infinity ? Infinity : limitLeftForOrder - orderTotal
        )
      ),
      perPersonLimit: schedule.perPersonLimit > 0 ? schedule.perPersonLimit : null,
    }));

  return { ...order, b2c_order_item: items, addableProducts };
}

export default async function OrdersPage() {
  const accountId = await getAccountId("b2c");
  const bankInfo = await getConfigs(["bank_name", "bank_account", "bank_holder"]);
  const { data: account } = await supabase
    .from("account")
    .select("nickname, phone")
    .eq("id", accountId)
    .single();
  const depositorNickname = account?.nickname && account?.phone ? account.nickname : null;
  const depositorPhoneSuffix =
    account?.nickname && account?.phone ? account.phone.replace(/\D/g, "").slice(-4) : null;

  const { data: rawOrders } = await supabase
    .from("b2c_order")
    .select(
      "id, order_type, status, total_amount, delivery_fee, delivery_photo_url, payment_confirmed_at, created_at, campaign_id, delivery_date, cancel_reason, refund_bank_name, campaign(delivery_date), b2c_order_item(id, quantity, unit_price, product_id, product(name, photo_url))"
    )
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  // 입금대기(수정 가능) 주문은 수량 변경 스테퍼에 재고/인당제한 상한을 걸어야 해서
  // 판매기간 기준 한도를 미리 계산해 각 상품에 붙여줌
  const orders = await Promise.all(
    (rawOrders ?? []).map(async (order: any) => {
      if (order.status !== "입금대기") return order;
      if (!order.campaign_id) return await withAlwaysOpenLimits(order, accountId);
      const limits = await getCampaignProductLimits(order.campaign_id);
      const items = await Promise.all(
        (order.b2c_order_item ?? []).map(async (item: any) => {
          const limit = limits.find((l) => l.product_id === item.product_id);
          if (!limit) return { ...item, maxQty: item.quantity };
          const sold = await getCampaignSold(order.campaign_id, item.product_id);
          // sold에는 이 주문의 현재 수량이 이미 포함돼있으므로 되돌려 더해줌
          const maxQty = Math.min(
            limit.per_person_limit ?? Infinity,
            limit.stock_limit - sold + item.quantity
          );
          return { ...item, maxQty, perPersonLimit: limit.per_person_limit };
        })
      );

      // 이 주문에 아직 안 담긴, 같은 판매기간의 다른 상품들 - "상품 추가"용
      const existingProductIds = new Set((order.b2c_order_item ?? []).map((i: any) => i.product_id));
      const addableLimits = limits.filter((l) => !existingProductIds.has(l.product_id));
      const addableProducts =
        addableLimits.length === 0
          ? []
          : await Promise.all(
              addableLimits.map(async (limit) => {
                const { data: product } = await supabase
                  .from("product")
                  .select("id, name, base_price")
                  .eq("id", limit.product_id)
                  .single();
                const sold = await getCampaignSold(order.campaign_id, limit.product_id);
                const remainingStock = Math.max(0, limit.stock_limit - sold);
                return {
                  id: limit.product_id,
                  name: product?.name ?? "상품",
                  base_price: product?.base_price ?? 0,
                  remainingStock,
                  perPersonLimit: limit.per_person_limit,
                };
              })
            );

      return { ...order, b2c_order_item: items, addableProducts };
    })
  );

  return (
    <div className="pb-32">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">주문내역</h1>
      </header>

      <main className="px-5">
        <OrdersClient
          orders={(orders as any) ?? []}
          bankInfo={bankInfo}
          depositorNickname={depositorNickname}
          depositorPhoneSuffix={depositorPhoneSuffix}
        />
      </main>

      <BottomNav active="/b2c/orders" />
    </div>
  );
}
