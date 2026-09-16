"use server";

import { supabase } from "@/lib/supabase";
import { getApprovedB2BAccountId } from "@/lib/getAccount";

type Result = { success: true } | { success: false; error: string };

const EDITABLE_STATUSES = ["발주요청", "승인대기"];

export async function updateB2BOrderQuantities(
  orderId: string,
  items: { itemId: string; quantity: number }[]
): Promise<Result> {
  try {
    const accountId = await getApprovedB2BAccountId();
    const { data: order, error: fetchError } = await supabase
      .from("b2b_order")
      .select("id, account_id, status")
      .eq("id", orderId)
      .single();
    if (fetchError || !order) throw new Error("발주를 찾을 수 없어요");
    if (order.account_id !== accountId) throw new Error("본인 발주만 수정할 수 있어요");
    if (!EDITABLE_STATUSES.includes(order.status)) throw new Error("이미 처리가 시작돼 수정할 수 없어요");

    let totalAmount = 0;
    for (const item of items) {
      const { data: row, error: rowError } = await supabase
        .from("b2b_order_item")
        .select("unit_price, order_id")
        .eq("id", item.itemId)
        .single();
      if (rowError || !row || row.order_id !== orderId) throw new Error("주문 상품을 찾을 수 없어요");
      if (item.quantity <= 0) throw new Error("수량은 1 이상이어야 해요");
      const subtotal = row.unit_price * item.quantity;
      totalAmount += subtotal;
      const { error } = await supabase
        .from("b2b_order_item")
        .update({ quantity: item.quantity, subtotal, adjusted: false, original_quantity: null })
        .eq("id", item.itemId);
      if (error) throw new Error(error.message);
    }

    // 수정 안 한 다른 상품들의 소계도 합계에 포함시켜야 함
    const { data: allItems } = await supabase
      .from("b2b_order_item")
      .select("subtotal")
      .eq("order_id", orderId);
    const fullTotal = (allItems ?? []).reduce((s, i) => s + i.subtotal, 0);

    const { error: totalError } = await supabase
      .from("b2b_order")
      .update({ total_amount: fullTotal })
      .eq("id", orderId);
    if (totalError) throw new Error(totalError.message);

    return { success: true };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as any).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return { success: false, error: e instanceof Error ? e.message : "수정 중 오류가 발생했어요" };
  }
}

export async function addB2BOrderItem(
  orderId: string,
  productId: string,
  quantity: number
): Promise<Result> {
  try {
    const accountId = await getApprovedB2BAccountId();
    const { data: order, error: fetchError } = await supabase
      .from("b2b_order")
      .select("id, account_id, status")
      .eq("id", orderId)
      .single();
    if (fetchError || !order) throw new Error("발주를 찾을 수 없어요");
    if (order.account_id !== accountId) throw new Error("본인 발주만 수정할 수 있어요");
    if (!EDITABLE_STATUSES.includes(order.status)) throw new Error("이미 처리가 시작돼 수정할 수 없어요");
    if (quantity <= 0) throw new Error("수량을 입력해주세요");

    const { data: priceRow, error: priceError } = await supabase
      .from("b2b_account_price")
      .select("price")
      .eq("account_id", accountId)
      .eq("product_id", productId)
      .single();
    if (priceError || !priceRow) throw new Error("취급하지 않는 상품이에요");

    const subtotal = priceRow.price * quantity;
    const { error: insertError } = await supabase.from("b2b_order_item").insert({
      order_id: orderId,
      product_id: productId,
      quantity,
      unit_price: priceRow.price,
      subtotal,
      added_later: true,
    });
    if (insertError) throw new Error(insertError.message);

    const { data: allItems } = await supabase.from("b2b_order_item").select("subtotal").eq("order_id", orderId);
    const fullTotal = (allItems ?? []).reduce((s, i) => s + i.subtotal, 0);
    const { error: totalError } = await supabase
      .from("b2b_order")
      .update({ total_amount: fullTotal })
      .eq("id", orderId);
    if (totalError) throw new Error(totalError.message);

    return { success: true };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as any).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return { success: false, error: e instanceof Error ? e.message : "추가 중 오류가 발생했어요" };
  }
}

export async function cancelB2BOrder(orderId: string, reason: string): Promise<Result> {
  try {
    const accountId = await getApprovedB2BAccountId();
    if (!reason.trim()) throw new Error("취소 사유를 입력해주세요");
    const { data: order, error: fetchError } = await supabase
      .from("b2b_order")
      .select("id, account_id, status")
      .eq("id", orderId)
      .single();
    if (fetchError || !order) throw new Error("발주를 찾을 수 없어요");
    if (order.account_id !== accountId) throw new Error("본인 발주만 취소할 수 있어요");
    if (!["발주요청", "승인대기"].includes(order.status))
      throw new Error("이미 배송이 시작된 발주는 취소할 수 없어요. 에그팜으로 문의해주세요");

    const { error } = await supabase
      .from("b2b_order")
      .update({ status: "취소", cancel_reason: reason.trim() })
      .eq("id", orderId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as any).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return { success: false, error: e instanceof Error ? e.message : "취소 중 오류가 발생했어요" };
  }
}
