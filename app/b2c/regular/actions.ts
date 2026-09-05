"use server";

import { supabase } from "@/lib/supabase";
import { getOrCreateDemoAccount } from "@/lib/demoAccount";
import { checkLimit } from "@/lib/limits";

// TODO: 실제 결제 연동 전까지는 구매 버튼을 누르면 바로 크레딧이 지급됩니다(테스트용)
export async function buyCreditPackage(count: number) {
  const accountId = await getOrCreateDemoAccount("b2c");
  const { error } = await supabase.from("credit_ledger").insert({
    account_id: accountId,
    delta: count,
    reason: "구매",
  });
  if (error) throw new Error(error.message);
  return { success: true as const };
}

export async function createRegularOrder(formData: FormData) {
  const accountId = await getOrCreateDemoAccount("b2c");

  const { data: ledger } = await supabase
    .from("credit_ledger")
    .select("delta")
    .eq("account_id", accountId);
  const balance = (ledger ?? []).reduce((s, r) => s + r.delta, 0);
  if (balance <= 0) throw new Error("잔여 크레딧이 없어요. 먼저 크레딧을 구매해주세요");

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
    if (!result.allowed) throw new Error(`${p.name}: ${result.reason}`);
    if (result.isOverflow) anyOverflow = true;
    items.push({ product_id: p.id, quantity: qty, unit_price: p.base_price, subtotal: 0 });
  }
  if (items.length === 0) throw new Error("배송받을 상품을 선택해주세요");

  const { data: order, error } = await supabase
    .from("b2c_order")
    .insert({
      account_id: accountId,
      order_type: "정기",
      status: "배송위임",
      is_overflow: anyOverflow,
      total_amount: 0,
    })
    .select("id")
    .single();
  if (error || !order) throw new Error(error?.message ?? "신청 생성 실패");

  await supabase
    .from("b2c_order_item")
    .insert(items.map((i) => ({ ...i, order_id: order.id })));

  await supabase.from("credit_ledger").insert({
    account_id: accountId,
    delta: -1,
    reason: "배송차감",
  });

  return { success: true as const };
}
