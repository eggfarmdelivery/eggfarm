"use server";

import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { checkQuantityChange } from "@/lib/limits";

type Result = { success: true } | { success: false; error: string };

export async function updateOrderQuantities(
  orderId: string,
  items: { itemId: string; productId: string; unitPrice: number; oldQty: number; newQty: number }[]
): Promise<Result> {
  try {
    const accountId = await getAccountId("b2c");

    const { data: order, error: orderError } = await supabase
      .from("b2c_order")
      .select("id, account_id, status")
      .eq("id", orderId)
      .single();
    if (orderError || !order) throw new Error("주문을 찾을 수 없어요");
    if (order.account_id !== accountId) throw new Error("본인 주문만 수정할 수 있어요");
    if (order.status !== "입금대기") {
      throw new Error("입금 확인 전에만 수량을 수정할 수 있어요");
    }

    let anyOverflow = false;
    for (const item of items) {
      if (item.newQty === item.oldQty) continue;
      if (item.newQty < 1) throw new Error("수량은 최소 1판 이상이어야 해요");
      const result = await checkQuantityChange(item.productId, item.oldQty, item.newQty);
      if (!result.allowed) throw new Error(result.reason ?? "수량을 변경할 수 없어요");
      if (result.isOverflow) anyOverflow = true;
    }

    for (const item of items) {
      if (item.newQty === item.oldQty) continue;
      const { error } = await supabase
        .from("b2c_order_item")
        .update({ quantity: item.newQty, subtotal: item.newQty * item.unitPrice })
        .eq("id", item.itemId);
      if (error) throw new Error(error.message);
    }

    const newTotal = items.reduce((sum, i) => sum + i.newQty * i.unitPrice, 0);
    const { error: totalError } = await supabase
      .from("b2c_order")
      .update({ total_amount: newTotal, is_overflow: anyOverflow })
      .eq("id", orderId);
    if (totalError) throw new Error(totalError.message);

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "수정 중 오류가 발생했어요" };
  }
}
