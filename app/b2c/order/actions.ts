"use server";

import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/getAccount";
import {
  checkCampaignLimit,
  getCampaignProductLimits,
  getCampaignZoneIds,
  calculateDeliveryFee,
} from "@/lib/campaign";
import { sendKakaoMemoToAdmin } from "@/lib/kakao";

type Result =
  | { success: true; remainingAmount: number }
  | { success: false; error: string };

export async function createGeneralOrder(formData: FormData): Promise<Result> {
  try {
    const accountId = await getAccountId("b2c");
    const campaignId = String(formData.get("campaign_id") ?? "").trim();
    if (!campaignId) throw new Error("캠페인 정보가 없어요. 다시 시도해주세요");

    // account 테이블은 RLS가 걸려있어 세션(로그인 쿠키) 있는 클라이언트로 조회해야 함
    // (anon 클라이언트로 조회하면 항상 null이 되어 매번 단지 불일치로 잘못 처리되던 버그 수정)
    const sessionSupabase = await createClient();
    const { data: account } = await sessionSupabase
      .from("account")
      .select("delivery_zone_id, nickname")
      .eq("id", accountId)
      .single();
    const zoneIds = await getCampaignZoneIds(campaignId);
    if (!account?.delivery_zone_id || !zoneIds.includes(account.delivery_zone_id)) {
      throw new Error("이 캠페인은 회원님의 단지에서는 이용할 수 없어요");
    }

    const productLimits = await getCampaignProductLimits(campaignId);
    if (productLimits.length === 0) throw new Error("이 캠페인에 포함된 상품이 없어요");

    const { data: products } = await supabase
      .from("product")
      .select("id, name, base_price")
      .in(
        "id",
        productLimits.map((l) => l.product_id)
      );

    if (!products) throw new Error("상품을 불러오지 못했어요");

    const items: { product_id: string; quantity: number; unit_price: number; subtotal: number }[] = [];

    for (const p of products) {
      const qty = Number(formData.get(`qty_${p.id}`) ?? 0);
      if (qty <= 0) continue;

      const limit = productLimits.find((l) => l.product_id === p.id);
      if (!limit) continue;

      const result = await checkCampaignLimit(campaignId, limit, qty);
      if (!result.allowed) {
        throw new Error(`${p.name}: ${result.reason}`);
      }

      items.push({
        product_id: p.id,
        quantity: qty,
        unit_price: p.base_price,
        subtotal: qty * p.base_price,
      });
    }

    if (items.length === 0) throw new Error("주문할 상품을 선택해주세요");

    const { data: campaign } = await supabase
      .from("campaign")
      .select("delivery_fee, free_shipping_min_qty")
      .eq("id", campaignId)
      .single();
    if (!campaign) throw new Error("캠페인 정보를 찾을 수 없어요");

    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const deliveryFee = calculateDeliveryFee(campaign, totalQty);

    const totalAmount = items.reduce((s, i) => s + i.subtotal, 0) + deliveryFee;

    // 크레딧 기능은 당분간 보류 - 항상 무통장입금(전액 입금대기)으로 처리
    const { data: order, error } = await supabase
      .from("b2c_order")
      .insert({
        account_id: accountId,
        campaign_id: campaignId,
        order_type: "일반",
        status: "입금대기",
        is_overflow: false,
        total_amount: totalAmount,
        delivery_fee: deliveryFee,
        credit_used: 0,
      })
      .select("id")
      .single();

    if (error || !order) throw new Error(error?.message ?? "주문 생성 실패");

    const itemsWithOrderId = items.map((i) => ({ ...i, order_id: order.id }));
    const { error: itemError } = await supabase.from("b2c_order_item").insert(itemsWithOrderId);
    if (itemError) throw new Error(itemError.message);

    const itemsSummary = products
      .filter((p) => items.some((i) => i.product_id === p.id))
      .map((p) => {
        const qty = items.find((i) => i.product_id === p.id)?.quantity ?? 0;
        return `${p.name} ${qty}판`;
      })
      .join(", ");
    await sendKakaoMemoToAdmin(
      `[새 주문] ${account?.nickname ?? "회원"}님 - ${itemsSummary} - ${totalAmount.toLocaleString()}원 (입금대기)`
    );

    return { success: true, remainingAmount: totalAmount };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "주문 처리 중 오류가 발생했어요" };
  }
}
