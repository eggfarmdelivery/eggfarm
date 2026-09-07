"use server";

import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { checkLimit } from "@/lib/limits";

type Result =
  | { success: true; remainingAmount: number }
  | { success: false; error: string };

export async function createGeneralOrder(formData: FormData): Promise<Result> {
  try {
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

    // 크레딧(선불잔액) 우선차감: 남은 금액만 계좌입금 대상
    const { data: ledger } = await supabase
      .from("credit_ledger")
      .select("delta")
      .eq("account_id", accountId);
    const balance = (ledger ?? []).reduce((s, r) => s + r.delta, 0);
    const creditUsed = Math.max(0, Math.min(balance, totalAmount));
    const remainingAmount = totalAmount - creditUsed;

    const { data: order, error } = await supabase
      .from("b2c_order")
      .insert({
        account_id: accountId,
        order_type: "일반",
        status: remainingAmount > 0 ? "입금대기" : "입금확인완료",
        is_overflow: anyOverflow,
        total_amount: totalAmount,
        credit_used: creditUsed,
        ...(remainingAmount <= 0 ? { payment_confirmed_at: new Date().toISOString() } : {}),
      })
      .select("id")
      .single();

    if (error || !order) throw new Error(error?.message ?? "주문 생성 실패");

    const itemsWithOrderId = items.map((i) => ({ ...i, order_id: order.id }));
    const { error: itemError } = await supabase.from("b2c_order_item").insert(itemsWithOrderId);
    if (itemError) throw new Error(itemError.message);

    if (creditUsed > 0) {
      const { error: creditError } = await supabase.from("credit_ledger").insert({
        account_id: accountId,
        delta: -creditUsed,
        reason: "주문결제",
      });
      if (creditError) throw new Error(creditError.message);
    }

    return { success: true, remainingAmount };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "주문 처리 중 오류가 발생했어요" };
  }
}
