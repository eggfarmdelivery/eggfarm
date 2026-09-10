"use server";

import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { getCampaignProductLimits, checkCampaignQuantityChange } from "@/lib/campaign";
import { logStatusChange } from "@/lib/statusLog";

type Result = { success: true } | { success: false; error: string };

// 취소 가능 여부 판단: 입금 전엔 그냥 취소(환불 불필요), 입금확인 후엔 환불계좌 입력 필요
const NO_PAYMENT_STATUSES = ["입금대기"];
const REFUND_ELIGIBLE_STATUSES = ["입금확인완료"];

export type RefundAccount = {
  bankName: string;
  accountNumber: string;
  holderName: string;
};

export async function cancelOrder(
  orderId: string,
  refundAccount?: RefundAccount
): Promise<Result> {
  try {
    const accountId = await getAccountId("b2c");
    const { data: order, error: orderError } = await supabase
      .from("b2c_order")
      .select("id, account_id, status")
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
    if (!refundAccount?.bankName || !refundAccount?.accountNumber || !refundAccount?.holderName) {
      throw new Error("환불받을 계좌 정보를 입력해주세요");
    }

    // 관리자가 실제로 계좌이체를 완료해야 "환불완료"로 넘어감 - 주문취소 시점엔 상태만 환불대기로 전환
    const { error } = await supabase
      .from("b2c_order")
      .update({
        status: "환불대기",
        refund_bank_name: refundAccount.bankName,
        refund_account_number: refundAccount.accountNumber,
        refund_holder_name: refundAccount.holderName,
      })
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
      .select("id, account_id, status, campaign_id")
      .eq("id", orderId)
      .single();
    if (orderError || !order) throw new Error("주문을 찾을 수 없어요");
    if (order.account_id !== accountId) throw new Error("본인 주문만 수정할 수 있어요");
    if (order.status !== "입금대기") {
      throw new Error("입금 확인 전에만 수량을 수정할 수 있어요");
    }

    const productLimits = order.campaign_id
      ? await getCampaignProductLimits(order.campaign_id)
      : [];

    for (const item of items) {
      if (item.newQty === item.oldQty) continue;
      if (item.newQty < 1) throw new Error("수량은 최소 1판 이상이어야 해요");
      const limit = productLimits.find((l) => l.product_id === item.productId);
      if (order.campaign_id && limit) {
        const result = await checkCampaignQuantityChange(
          order.campaign_id,
          limit,
          item.oldQty,
          item.newQty
        );
        if (!result.allowed) throw new Error(result.reason ?? "수량을 변경할 수 없어요");
      }
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
      .update({ total_amount: newTotal })
      .eq("id", orderId);
    if (totalError) throw new Error(totalError.message);

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "수정 중 오류가 발생했어요" };
  }
}
