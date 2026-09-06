"use server";

import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { checkLimit } from "@/lib/limits";

export async function createGeneralOrder(formData: FormData) {
  const accountId = await getAccountId("b2c");

  const { data: products } = await supabase
    .from("product")
    .select("id, name, base_price")
    .eq("is_active", true);

  if (!products) throw new Error("상품을 불러오지 못했어요");

  const items: { product_id: string; quantity: number; unit_price: number; subtotal: number }[] = [];
  let anyOverflow = false;

  for (const p of products) {
    const qty = Number(formData.get(`qty_${p.id}`) ?? 0);
    if (qty <= 0) continue;

    const result = await checkLimit(p.id, qty);
    if (!result.allowed) {
      throw new Error(`${p.name}: ${result.reason}`);
    }
    if (result.isOverflow) anyOverflow = true;

    items.push({
      product_id: p.id,
      quantity: qty,
      unit_price: p.base_price,
      subtotal: qty * p.base_price,
    });
  }

  if (items.length === 0) throw new Error("주문할 상품을 선택해주세요");

  const totalAmount = items.reduce((s, i) => s + i.subtotal, 0);

  const { data: order, error } = await supabase
    .from("b2c_order")
    .insert({
      account_id: accountId,
      order_type: "일반",
      status: "입금대기",
      is_overflow: anyOverflow,
      total_amount: totalAmount,
    })
    .select("id")
    .single();

  if (error || !order) throw new Error(error?.message ?? "주문 생성 실패");

  const itemsWithOrderId = items.map((i) => ({ ...i, order_id: order.id }));
  await supabase.from("b2c_order_item").insert(itemsWithOrderId);

  return { success: true as const };
}
