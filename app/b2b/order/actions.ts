"use server";

import { supabase } from "@/lib/supabase";
import { getApprovedB2BAccountId } from "@/lib/getAccount";
import { getOrderWindowStatus } from "@/lib/b2bDeadline";
import { getConfig } from "@/lib/settings";

type Result = { success: true } | { success: false; error: string };

export async function createB2BOrder(formData: FormData): Promise<Result> {
  try {
    const window = await getOrderWindowStatus();
    if (!window.isOpen) {
      throw new Error("지금은 발주 접수 시간이 아니에요");
    }

    const accountId = await getApprovedB2BAccountId();

    const { data: products } = await supabase
      .from("product")
      .select("id, name, base_price")
      .eq("is_active", true);
    if (!products) throw new Error("상품을 불러오지 못했어요");

    const { data: contractPrices } = await supabase
      .from("b2b_account_price")
      .select("product_id, price")
      .eq("account_id", accountId);
    const priceMap = new Map(
      (contractPrices ?? []).map((r) => [r.product_id, r.price])
    );

    const items: { product_id: string; quantity: number; unit_price: number; subtotal: number }[] = [];

    for (const p of products) {
      const qty = Number(formData.get(`qty_${p.id}`) ?? 0);
      if (qty <= 0) continue;
      if (!priceMap.has(p.id)) continue; // 이 거래처에 등록되지 않은 상품은 서버에서도 무시함
      const unitPrice = priceMap.get(p.id)!;
      items.push({
        product_id: p.id,
        quantity: qty,
        unit_price: unitPrice,
        subtotal: qty * unitPrice,
      });
    }
    if (items.length === 0) throw new Error("발주할 상품을 선택해주세요");

    const totalAmount = items.reduce((s, i) => s + i.subtotal, 0);

    const minOrderAmount = Number(await getConfig("b2b_min_order_amount")) || 0;
    if (minOrderAmount > 0 && totalAmount < minOrderAmount) {
      throw new Error(`최소 발주금액(${minOrderAmount.toLocaleString()}원)보다 적어요`);
    }

    const desiredDeliveryDate = String(formData.get("desired_delivery_date") ?? "").trim() || null;

    const { data: order, error } = await supabase
      .from("b2b_order")
      .insert({
        account_id: accountId,
        status: "발주요청",
        total_amount: totalAmount,
        desired_delivery_date: desiredDeliveryDate,
      })
      .select("id")
      .single();
    if (error || !order) throw new Error(error?.message ?? "발주 생성 실패");

    const { error: itemError } = await supabase
      .from("b2b_order_item")
      .insert(items.map((i) => ({ ...i, order_id: order.id })));
    if (itemError) throw new Error(itemError.message);

    return { success: true };
  } catch (e) {
    // getApprovedB2BAccountId()의 redirect()는 특수 에러를 throw하는 방식이라,
    // 그냥 일반 에러로 삼켜버리면 안내 화면으로 못 넘어가고 이상한 에러 메시지만 뜸
    if (e && typeof e === "object" && "digest" in e && String((e as any).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return { success: false, error: e instanceof Error ? e.message : "발주 처리 중 오류가 발생했어요" };
  }
}
