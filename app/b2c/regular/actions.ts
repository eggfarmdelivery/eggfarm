"use server";

import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { checkLimit } from "@/lib/limits";

type Result = { success: true } | { success: false; error: string };

// 크레딧 = 계란 선결제 개념(원 단위 잔액). "10판 선결제" 같은 금액 충전이며,
// 배송비 무료쿠폰 개념이 아님 — 정기배송은 상품가격만큼 이 잔액에서 차감됨.
// TODO: 실제 결제(계좌이체 입금확인) 연동 전까지는 구매 버튼을 누르면 바로 충전됩니다(테스트용)
export async function buyCreditPackage(amount: number): Promise<Result> {
  try {
    const accountId = await getAccountId("b2c");
    const { error } = await supabase.from("credit_ledger").insert({
      account_id: accountId,
      delta: amount,
      reason: "충전",
    });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "충전 중 오류가 발생했어요" };
  }
}

export async function createRegularOrder(formData: FormData): Promise<Result> {
  try {
    const accountId = await getAccountId("b2c");

    const { data: ledger } = await supabase
      .from("credit_ledger")
      .select("delta")
      .eq("account_id", accountId);
    const balance = (ledger ?? []).reduce((s, r) => s + r.delta, 0);

    const { data: products } = await supabase
      .from("product")
      .select("id, name, base_price")
      .eq("is_active", true);
    if (!products) throw new Error("상품을 불러오지 못했어요");

    const items: { product_id: string; quantity: number; unit_price: number; subtotal: number }[] = [];
    let anyOverflow = false;
    let total = 0;

    for (const p of products) {
      const qty = Number(formData.get(`qty_${p.id}`) ?? 0);
      if (qty <= 0) continue;
      const result = await checkLimit(p.id, qty);
      if (!result.allowed) throw new Error(`${p.name}: ${result.reason}`);
      if (result.isOverflow) anyOverflow = true;
      const subtotal = p.base_price * qty;
      total += subtotal;
      items.push({ product_id: p.id, quantity: qty, unit_price: p.base_price, subtotal });
    }
    if (items.length === 0) throw new Error("배송받을 상품을 선택해주세요");
    if (balance < total) {
      throw new Error(
        `잔여 크레딧(${balance.toLocaleString()}원)이 부족해요. 먼저 크레딧을 충전해주세요`
      );
    }

    const { data: order, error } = await supabase
      .from("b2c_order")
      .insert({
        account_id: accountId,
        order_type: "정기",
        status: "배송위임",
        is_overflow: anyOverflow,
        total_amount: total,
      })
      .select("id")
      .single();
    if (error || !order) throw new Error(error?.message ?? "신청 생성 실패");

    const { error: itemError } = await supabase
      .from("b2c_order_item")
      .insert(items.map((i) => ({ ...i, order_id: order.id })));
    if (itemError) throw new Error(itemError.message);

    const { error: creditError } = await supabase.from("credit_ledger").insert({
      account_id: accountId,
      delta: -total,
      reason: "배송차감",
    });
    if (creditError) throw new Error(creditError.message);

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "신청 처리 중 오류가 발생했어요" };
  }
}
