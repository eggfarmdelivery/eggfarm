"use server";

import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import {
  getCampaignProductLimits,
  checkCampaignQuantityChange,
  checkCampaignLimit,
  calculateDeliveryFee,
} from "@/lib/campaign";
import { logStatusChange } from "@/lib/statusLog";
import { getSchedule } from "@/lib/schedule";
import { calculateFee, formatKoDate } from "@/lib/scheduleShared";
import { adjustStock, notifyStockChange, restoreOrderStock, getPersonQtyForDate, isTestAccount } from "@/lib/stock";

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
      await logStatusChange("b2c_order", orderId, order.status, "취소", "고객");
      await restoreOrderStock(orderId);
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
    await logStatusChange("b2c_order", orderId, order.status, "환불대기", "고객");
    await restoreOrderStock(orderId);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "취소 처리 중 오류가 발생했어요" };
  }
}

// 관리자가 먼저 취소해서 환불대기로 바뀐 주문은 환불계좌 정보가 비어있을 수 있음 -
// 이 경우 구매자가 직접 환불계좌를 입력할 수 있게 해줌
export async function submitRefundAccount(
  orderId: string,
  refundAccount: RefundAccount
): Promise<Result> {
  try {
    const accountId = await getAccountId("b2c");
    const { data: order, error: orderError } = await supabase
      .from("b2c_order")
      .select("id, account_id, status")
      .eq("id", orderId)
      .single();
    if (orderError || !order) throw new Error("주문을 찾을 수 없어요");
    if (order.account_id !== accountId) throw new Error("본인 주문만 처리할 수 있어요");
    if (order.status !== "환불대기") throw new Error("환불대기 상태의 주문만 입력할 수 있어요");
    if (!refundAccount.bankName || !refundAccount.accountNumber || !refundAccount.holderName) {
      throw new Error("환불받을 계좌 정보를 모두 입력해주세요");
    }

    const { error } = await supabase
      .from("b2c_order")
      .update({
        refund_bank_name: refundAccount.bankName,
        refund_account_number: refundAccount.accountNumber,
        refund_holder_name: refundAccount.holderName,
      })
      .eq("id", orderId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "저장 중 오류가 발생했어요" };
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
      .select("id, account_id, status, campaign_id, delivery_date")
      .eq("id", orderId)
      .single();
    if (orderError || !order) throw new Error("주문을 찾을 수 없어요");
    if (order.account_id !== accountId) throw new Error("본인 주문만 수정할 수 있어요");
    if (order.status !== "입금대기") {
      throw new Error("입금 확인 전에만 수량을 수정할 수 있어요");
    }

    // 상시운영 주문(캠페인 없음): 전체 재고 풀 + 배송일 합산 한도로 처리
    if (!order.campaign_id) {
      return await updateQuantitiesAlwaysOpen(orderId, accountId, order.delivery_date, items);
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

    // 배송비는 총 판수 기준이라, 수량이 바뀌면 무료배송 기준을 넘나들 수 있어 다시 계산해야 함
    const { data: allItems } = await supabase
      .from("b2c_order_item")
      .select("quantity, subtotal")
      .eq("order_id", orderId);
    const productTotal = (allItems ?? []).reduce((sum, i) => sum + i.subtotal, 0);
    const totalQty = (allItems ?? []).reduce((sum, i) => sum + i.quantity, 0);

    let deliveryFee = 0;
    if (order.campaign_id) {
      const { data: campaign } = await supabase
        .from("campaign")
        .select("delivery_fee, free_shipping_min_qty")
        .eq("id", order.campaign_id)
        .single();
      if (campaign) deliveryFee = calculateDeliveryFee(campaign, totalQty);
    }

    const { error: totalError } = await supabase
      .from("b2c_order")
      .update({ total_amount: productTotal + deliveryFee, delivery_fee: deliveryFee })
      .eq("id", orderId);
    if (totalError) throw new Error(totalError.message);

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "수정 중 오류가 발생했어요" };
  }
}

// 입금 전(입금대기) 주문에 새 상품을 추가로 담기
export async function addOrderItem(
  orderId: string,
  productId: string,
  quantity: number
): Promise<Result> {
  try {
    const accountId = await getAccountId("b2c");

    const { data: order, error: orderError } = await supabase
      .from("b2c_order")
      .select("id, account_id, status, campaign_id, delivery_date")
      .eq("id", orderId)
      .single();
    if (orderError || !order) throw new Error("주문을 찾을 수 없어요");
    if (order.account_id !== accountId) throw new Error("본인 주문만 수정할 수 있어요");
    if (order.status !== "입금대기") {
      throw new Error("입금 확인 전에만 상품을 추가할 수 있어요");
    }
    if (quantity < 1) throw new Error("수량은 최소 1판 이상이어야 해요");
    if (!order.campaign_id) {
      return await addItemAlwaysOpen(orderId, accountId, order.delivery_date, productId, quantity);
    }

    const { data: existing } = await supabase
      .from("b2c_order_item")
      .select("id")
      .eq("order_id", orderId)
      .eq("product_id", productId)
      .maybeSingle();
    if (existing) throw new Error("이미 담긴 상품이에요. 수량을 조절해주세요");

    const productLimits = await getCampaignProductLimits(order.campaign_id);
    const limit = productLimits.find((l) => l.product_id === productId);
    if (!limit) throw new Error("이 판매기간에 없는 상품이에요");

    const result = await checkCampaignLimit(order.campaign_id, limit, quantity);
    if (!result.allowed) throw new Error(result.reason ?? "추가할 수 없어요");

    const { data: product } = await supabase
      .from("product")
      .select("name, base_price")
      .eq("id", productId)
      .single();
    if (!product) throw new Error("상품 정보를 찾을 수 없어요");

    const { error: insertError } = await supabase.from("b2c_order_item").insert({
      order_id: orderId,
      product_id: productId,
      quantity,
      unit_price: product.base_price,
      subtotal: quantity * product.base_price,
    });
    if (insertError) throw new Error(insertError.message);

    const { data: allItems } = await supabase
      .from("b2c_order_item")
      .select("quantity, subtotal")
      .eq("order_id", orderId);
    const productTotal = (allItems ?? []).reduce((sum, i) => sum + i.subtotal, 0);
    const totalQty = (allItems ?? []).reduce((sum, i) => sum + i.quantity, 0);

    const { data: campaign } = await supabase
      .from("campaign")
      .select("delivery_fee, free_shipping_min_qty")
      .eq("id", order.campaign_id)
      .single();
    const deliveryFee = campaign ? calculateDeliveryFee(campaign, totalQty) : 0;

    const { error: totalError } = await supabase
      .from("b2c_order")
      .update({ total_amount: productTotal + deliveryFee, delivery_fee: deliveryFee })
      .eq("id", orderId);
    if (totalError) throw new Error(totalError.message);

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "상품 추가 중 오류가 발생했어요" };
  }
}


// ---------------------------------------------------------------
// 상시운영 주문(캠페인 없음)의 수량 수정 / 상품 추가
// ---------------------------------------------------------------

async function applyStockChanges(
  orderId: string,
  changes: { productId: string; delta: number }[],
  reason: string
): Promise<{ ok: true; done: { productId: string; delta: number; before: number }[] } | { ok: false; error: string }> {
  const done: { productId: string; delta: number; before: number }[] = [];
  // 재고를 되돌려주는(음수 변화) 것부터 처리하면 중간 실패 가능성이 줄어듦
  const ordered = [...changes].sort((a, b) => a.delta - b.delta);
  for (const c of ordered) {
    if (c.delta === 0) continue;
    const res = await adjustStock(c.productId, -c.delta, reason, orderId);
    if (!res.ok) {
      for (const d of done) await adjustStock(d.productId, d.delta, "취소복원", orderId);
      return { ok: false, error: "재고가 부족해서 수량을 변경할 수 없어요" };
    }
    done.push({ productId: c.productId, delta: c.delta, before: res.qty + c.delta });
  }
  return { ok: true, done };
}

async function recalcOrderTotal(orderId: string) {
  const schedule = await getSchedule();
  const { data: allItems } = await supabase
    .from("b2c_order_item")
    .select("quantity, subtotal")
    .eq("order_id", orderId);
  const productTotal = (allItems ?? []).reduce((sum, i) => sum + i.subtotal, 0);
  const totalQty = (allItems ?? []).reduce((sum, i) => sum + i.quantity, 0);
  const deliveryFee = calculateFee(schedule, totalQty);
  const { error } = await supabase
    .from("b2c_order")
    .update({ total_amount: productTotal + deliveryFee, delivery_fee: deliveryFee })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}

async function checkPersonLimit(
  accountId: string,
  deliveryDate: string | null,
  orderId: string,
  newOrderQty: number
) {
  const schedule = await getSchedule();
  if (schedule.perPersonLimit <= 0 || !deliveryDate) return;
  const others = await getPersonQtyForDate(accountId, deliveryDate, orderId);
  if (others + newOrderQty > schedule.perPersonLimit) {
    throw new Error(
      `${formatKoDate(deliveryDate)} 배송분은 ${schedule.perPersonLimit}판까지 주문할 수 있어요`
    );
  }
}

async function updateQuantitiesAlwaysOpen(
  orderId: string,
  accountId: string,
  deliveryDate: string | null,
  items: { itemId: string; productId: string; unitPrice: number; oldQty: number; newQty: number }[]
): Promise<Result> {
  for (const item of items) {
    if (item.newQty === item.oldQty) continue;
    if (item.newQty < 1) throw new Error("수량은 최소 1판 이상이어야 해요");
  }
  // 화면에서 보낸 값을 그대로 믿지 않고 DB의 현재 수량 기준으로 다시 계산
  const { data: current } = await supabase
    .from("b2c_order_item")
    .select("id, product_id, quantity")
    .eq("order_id", orderId);
  const currentMap = new Map((current ?? []).map((c) => [c.id, c]));
  let newTotal = (current ?? []).reduce((s, c) => s + c.quantity, 0);
  const changes: { productId: string; delta: number }[] = [];
  for (const item of items) {
    const cur = currentMap.get(item.itemId);
    if (!cur || item.newQty === cur.quantity) continue;
    changes.push({ productId: cur.product_id, delta: item.newQty - cur.quantity });
    newTotal += item.newQty - cur.quantity;
  }
  if (changes.length === 0) return { success: true };

  await checkPersonLimit(accountId, deliveryDate, orderId, newTotal);

  const test = await isTestAccount(accountId);
  let stockResult: Awaited<ReturnType<typeof applyStockChanges>> | null = null;
  if (!test) {
    stockResult = await applyStockChanges(orderId, changes, "수정");
    if (!stockResult.ok) throw new Error(stockResult.error);
  }

  try {
    for (const item of items) {
      const cur = currentMap.get(item.itemId);
      if (!cur || item.newQty === cur.quantity) continue;
      const { error } = await supabase
        .from("b2c_order_item")
        .update({ quantity: item.newQty, subtotal: item.newQty * item.unitPrice })
        .eq("id", item.itemId);
      if (error) throw new Error(error.message);
    }
    await recalcOrderTotal(orderId);
  } catch (e) {
    if (stockResult?.ok) {
      for (const d of stockResult.done) await adjustStock(d.productId, d.delta, "취소복원", orderId);
    }
    throw e;
  }

  if (stockResult?.ok) {
    for (const d of stockResult.done) {
      if (d.delta > 0) await notifyStockChange(d.productId, d.before, d.before - d.delta).catch(() => {});
    }
  }
  return { success: true };
}

async function addItemAlwaysOpen(
  orderId: string,
  accountId: string,
  deliveryDate: string | null,
  productId: string,
  quantity: number
): Promise<Result> {
  const { data: existing } = await supabase
    .from("b2c_order_item")
    .select("id, quantity")
    .eq("order_id", orderId);
  const { data: dup } = await supabase
    .from("b2c_order_item")
    .select("id")
    .eq("order_id", orderId)
    .eq("product_id", productId)
    .maybeSingle();
  if (dup) throw new Error("이미 담긴 상품이에요. 수량을 조절해주세요");

  const newTotal = (existing ?? []).reduce((s, i) => s + i.quantity, 0) + quantity;
  await checkPersonLimit(accountId, deliveryDate, orderId, newTotal);

  const { data: product } = await supabase
    .from("product")
    .select("name, base_price, is_active")
    .eq("id", productId)
    .single();
  if (!product || product.is_active === false) throw new Error("상품 정보를 찾을 수 없어요");

  const test = await isTestAccount(accountId);
  let before = 0;
  if (!test) {
    const res = await adjustStock(productId, -quantity, "수정", orderId);
    if (!res.ok) throw new Error("재고가 부족해서 추가할 수 없어요");
    before = res.qty + quantity;
  }

  const { error: insertError } = await supabase.from("b2c_order_item").insert({
    order_id: orderId,
    product_id: productId,
    quantity,
    unit_price: product.base_price,
    subtotal: quantity * product.base_price,
  });
  if (insertError) {
    if (!test) await adjustStock(productId, quantity, "취소복원", orderId);
    throw new Error(insertError.message);
  }
  try {
    await recalcOrderTotal(orderId);
  } catch (e) {
    await supabase.from("b2c_order_item").delete().eq("order_id", orderId).eq("product_id", productId);
    if (!test) await adjustStock(productId, quantity, "취소복원", orderId);
    throw e;
  }
  if (!test) await notifyStockChange(productId, before, before - quantity).catch(() => {});
  return { success: true };
}
