export const dynamic = "force-dynamic";

import Link from "next/link";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { maskPhone, maskUnit } from "@/lib/mask";
import { getCampaignProductLimits, getCampaignSold } from "@/lib/campaign";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "./LogoutButton";
import OrdersClient from "@/app/b2c/orders/OrdersClient";

export default async function MyPage() {
  const accountId = await getAccountId("b2c");
  const sessionSupabase = await createClient();

  const { data: account } = await sessionSupabase
    .from("account")
    .select("name, phone, nickname, delivery_zone_id, address_dong, address_ho")
    .eq("id", accountId)
    .single();

  const { data: zone } = account?.delivery_zone_id
    ? await supabase
        .from("delivery_zone")
        .select("name")
        .eq("id", account.delivery_zone_id)
        .single()
    : { data: null };

  const { data: rawOrders } = await supabase
    .from("b2c_order")
    .select(
      "id, order_type, status, total_amount, delivery_fee, delivery_photo_url, payment_confirmed_at, created_at, campaign_id, campaign(delivery_date), b2c_order_item(id, quantity, unit_price, product_id, product(name, photo_url))"
    )
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  // 입금대기(수정 가능) 주문은 수량 변경 스테퍼에 재고/인당제한 상한을 걸어야 해서
  // 캠페인 기준 한도를 미리 계산해 각 상품에 붙여줌
  const orders = await Promise.all(
    (rawOrders ?? []).map(async (order: any) => {
      if (order.status !== "입금대기" || !order.campaign_id) return order;
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

      // 이 주문에 아직 안 담긴, 같은 캠페인의 다른 상품들 - "상품 추가"용
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

  const depositorName =
    account?.nickname && account?.phone
      ? `${account.nickname}${account.phone.replace(/\D/g, "").slice(-4)}`
      : null;

  return (
    <div className="pb-32">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">내 정보</h1>
      </header>

      <main className="px-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon.png"
              alt=""
              className="h-12 w-12 shrink-0 rounded-full bg-primary-bg p-1.5"
            />
            <div>
              <p className="text-base font-medium">{account?.name ?? "-"}</p>
            </div>
          </div>
          <Link href="/b2c/mypage/edit" aria-label="회원정보 수정" className="p-1.5 text-neutral-500">
            <Settings size={20} />
          </Link>
        </div>

        <div className="mb-6 rounded-xl border border-neutral-200 p-4 text-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 py-2 first:pt-0">
            <span className="text-neutral-500">전화번호</span>
            <span>{account?.phone ? maskPhone(account.phone) : "-"}</span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 py-2">
            <span className="text-neutral-500">닉네임</span>
            <span>{account?.nickname ?? "-"}</span>
          </div>
          {depositorName && (
            <div className="flex items-center justify-between border-b border-neutral-100 py-2">
              <span className="text-neutral-500">입금자명</span>
              <span className="font-medium text-primary-dark">{depositorName}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-2 last:pb-0">
            <span className="text-neutral-500">배송지</span>
            <span>
              {zone?.name
                ? `${zone.name} ${account?.address_dong}동 ${maskUnit(account?.address_ho ?? "")}호`
                : "-"}
            </span>
          </div>
        </div>

        <p className="mb-2 text-sm font-medium">주문내역</p>
        <OrdersClient orders={(orders as any) ?? []} />

        <div className="mt-5">
          <LogoutButton />
        </div>
      </main>

      <BottomNav active="/b2c/mypage" />
    </div>
  );
}
