"use server";

import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { checkQuantityChange } from "@/lib/limits";
import { logStatusChange } from "@/lib/statusLog";

type Result = { success: true } | { success: false; error: string };

// 취소 가능 여부 판단: 입금 전엔 그냥 취소(환불 불필요), 입금확인~배송준비까지는 환불방식 선택 필요
const NO_PAYMENT_STATUSES = ["입금대기"];
const REFUND_ELIGIBLE_STATUSES = ["입금확인완료", "배송준비"];

export async function cancelOrder(
  orderId: string,
  refundMethod?: "credit" | "bank"
): Promise<Result> {
  try {
    const accountId = await getAccountId("b2c");
    const { data: order, error: orderError } = await supabase
      .from("b2c_order")
      .select("id, account_id, status, total_amount")
      .eq("id", orderId)
      .single();
    if (orderError || !order) throw new Error("주문을 찾을 수 없어요");
    if (order.account_id !== accountId) throw new Error("본인 주문만 취소할 수 있어요");

    if (NO_PAYMENT_STATUSES.includes(order.status)) {
      const { error } = await supabase.from("b2c_order").update({ status: "취소" }).eq("id", orderId);
      if (error) throw new Error(error.message);
      await logStatusChange("b2c_order", orderId, order.status, "취소");
      return { success: true };
    }

    if (!REFUND_ELIGIBLE_STATUSES.includes(order.status)) {
      throw new Error("배송이 시작된 이후에는 취소할 수 없어요");
    }
    if (!refundMethod) throw new Error("환불 방법을 선택해주세요");

    if (refundMethod === "credit") {
      const { error: creditError } = await supabase.from("credit_ledger").insert({
        account_id: accountId,
        delta: order.total_amount,
        reason: "주문취소환급",
      });
      if (creditError) throw new Error(creditError.message);

      const { error } = await supabase
        .from("b2c_order")
        .update({ status: "환불완료" })
        .eq("id", orderId);
      if (error) throw new Error(error.message);
      await logStatusChange("b2c_order", orderId, order.status, "환불완료");
      return { success: true };
    }

    // 계좌환불: 관리자가 실제 이체 후 확정 처리
    const { error } = await supabase
      .from("b2c_order")
      .update({ status: "환불대기" })
      .eq("id", orderId);
    if (error) throw new Error(error.message);
    await logStatusChange("b2c_order", orderId, order.status, "환불대기");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "취소 처리 중 오류가 발생했어요" };
  }
}

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
