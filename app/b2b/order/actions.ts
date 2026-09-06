"use server";

import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { getOrderWindowStatus } from "@/lib/b2bDeadline";

export async function createB2BOrder(formData: FormData) {
  const window = await getOrderWindowStatus();
  if (!window.isOpen) {
    throw new Error("지금은 발주 접수 시간이 아니에요");
  }

  const accountId = await getAccountId("b2b");

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
    const unitPrice = priceMap.get(p.id) ?? p.base_price;
    items.push({
      product_id: p.id,
      quantity: qty,
      unit_price: unitPrice,
      subtotal: qty * unitPrice,
    });
  }
  if (items.length === 0) throw new Error("발주할 상품을 선택해주세요");

  const totalAmount = items.reduce((s, i) => s + i.subtotal, 0);

  const { data: order, error } = await supabase
    .from("b2b_order")
    .insert({ account_id: accountId, status: "발주요청", total_amount: totalAmount })
    .select("id")
    .single();
  if (error || !order) throw new Error(error?.message ?? "발주 생성 실패");

  await supabase
    .from("b2b_order_item")
    .insert(items.map((i) => ({ ...i, order_id: order.id })));

  return { success: true as const };
}
