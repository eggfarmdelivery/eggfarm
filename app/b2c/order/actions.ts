"use server";

import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/getAccount";
import { sendKakaoMemoToAdmin } from "@/lib/kakao";
import { getSchedule } from "@/lib/schedule";
import { computeDeliverySlot, calculateFee, formatKoDate } from "@/lib/scheduleShared";
import { adjustStock, notifyStockChange, getPersonQtyForDate } from "@/lib/stock";

type Result =
  | { success: true; remainingAmount: number }
  | { success: false; error: string };

export async function createGeneralOrder(formData: FormData): Promise<Result> {
  // 재고를 먼저 차감한 뒤 주문 생성에 실패하면 되돌려야 해서, 차감 내역을 기억해둠
  const applied: { productId: string; qty: number; before: number }[] = [];
  let createdOrderId: string | null = null;
  const newOrderId = randomUUID();
  try {
    const accountId = await getAccountId("b2c");

    // account 테이블은 RLS가 걸려있어 세션(로그인 쿠키) 있는 클라이언트로 조회해야 함
    const sessionSupabase = await createClient();
    const { data: account } = await sessionSupabase
      .from("account")
      .select("delivery_zone_id, nickname, is_test")
      .eq("id", accountId)
      .single();
    if (!account?.delivery_zone_id) {
      throw new Error("배송받을 단지가 등록되지 않았어요. 마이페이지에서 확인해주세요");
    }
    const { data: zone } = await supabase
      .from("delivery_zone")
      .select("is_active")
      .eq("id", account.delivery_zone_id)
      .maybeSingle();
    if (!zone || zone.is_active === false) {
      throw new Error("회원님의 단지는 현재 배송이 어려워요");
    }

    const schedule = await getSchedule();
    const slot = computeDeliverySlot(new Date(), schedule);

    const { data: products } = await supabase
      .from("product")
      .select("id, name, base_price, stock_qty, is_active")
      .eq("is_active", true);
    if (!products) throw new Error("상품을 불러오지 못했어요");

    const items: { product_id: string; quantity: number; unit_price: number; subtotal: number }[] = [];
    for (const p of products) {
      const qty = Math.floor(Number(formData.get(`qty_${p.id}`) ?? 0));
      if (!qty || qty <= 0) continue;
      items.push({
        product_id: p.id,
        quantity: qty,
        unit_price: p.base_price,
        subtotal: qty * p.base_price,
      });
    }
    if (items.length === 0) throw new Error("주문할 상품을 선택해주세요");

    const totalQty = items.reduce((s, i) => s + i.quantity, 0);

    // 인당 한도: 같은 배송일로 들어간 내 주문 전체를 합산
    if (schedule.perPersonLimit > 0) {
      const already = await getPersonQtyForDate(accountId, slot.date);
      if (already + totalQty > schedule.perPersonLimit) {
        const left = Math.max(0, schedule.perPersonLimit - already);
        throw new Error(
          left > 0
            ? `${formatKoDate(slot.date)} 배송분은 ${schedule.perPersonLimit}판까지 주문할 수 있어요. ${left}판 더 주문할 수 있어요`
            : `${formatKoDate(slot.date)} 배송분은 이미 최대(${schedule.perPersonLimit}판)로 주문하셨어요`
        );
      }
    }

    const deliveryFee = calculateFee(schedule, totalQty);
    const totalAmount = items.reduce((s, i) => s + i.subtotal, 0) + deliveryFee;

    // 방금 전(60초 이내)에 같은 계정·배송일·금액으로 만든 "입금대기" 주문이 있으면
    // 응답이 늦어져서 다시 누른 중복 클릭일 가능성이 높음 - 새로 만들지 않고 그 주문을 그대로 반환
    const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: recentDuplicate } = await supabase
      .from("b2c_order")
      .select("id, total_amount")
      .eq("account_id", accountId)
      .eq("delivery_date", slot.date)
      .eq("status", "입금대기")
      .eq("total_amount", totalAmount)
      .gte("created_at", sixtySecondsAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recentDuplicate) {
      return { success: true, remainingAmount: recentDuplicate.total_amount };
    }

    // 재고 차감(테스트 계정은 실제 재고를 깎지 않음). 부족하면 이미 차감한 것까지 되돌리고 중단
    const isTest = !!account.is_test;
    if (!isTest) {
      for (const item of items) {
        const p = products.find((x) => x.id === item.product_id)!;
        const res = await adjustStock(item.product_id, -item.quantity, "주문", newOrderId);
        if (!res.ok) {
          const current = Math.max(0, (await currentStock(item.product_id)) ?? 0);
          throw new Error(
            current > 0 ? `${p.name}: 재고가 ${current}판만 남았어요` : `${p.name}: 품절됐어요`
          );
        }
        applied.push({ productId: item.product_id, qty: item.quantity, before: res.qty + item.quantity });
      }
    }

    // 크레딧 기능은 당분간 보류 - 항상 무통장입금(전액 입금대기)으로 처리
    const { data: order, error } = await supabase
      .from("b2c_order")
      .insert({
        id: newOrderId,
        account_id: accountId,
        campaign_id: null,
        delivery_date: slot.date,
        order_type: "일반",
        status: "입금대기",
        is_overflow: false,
        total_amount: totalAmount,
        delivery_fee: deliveryFee,
        credit_used: 0,
      })
      .select("id")
      .single();
    if (error || !order) throw new Error(error?.message ?? "주문 생성 실패");
    createdOrderId = order.id;

    const itemsWithOrderId = items.map((i) => ({ ...i, order_id: order.id }));
    const { error: itemError } = await supabase.from("b2c_order_item").insert(itemsWithOrderId);
    if (itemError) {
      await supabase.from("b2c_order").delete().eq("id", order.id);
      createdOrderId = null;
      throw new Error(itemError.message);
    }

    // 알림 실패가 주문 성공을 막으면 안 되므로 따로 감쌈
    try {
      const itemsSummary = products
        .filter((p) => items.some((i) => i.product_id === p.id))
        .map((p) => `${p.name} ${items.find((i) => i.product_id === p.id)?.quantity ?? 0}판`)
        .join(", ");
      await sendKakaoMemoToAdmin(
        `[새 주문] ${account?.nickname ?? "회원"}님 - ${itemsSummary} - ${totalAmount.toLocaleString()}원 (입금대기, ${formatKoDate(slot.date)} 배송)`,
        "https://eggfarm.shop/admin"
      );

      for (const a of applied) {
        await notifyStockChange(a.productId, a.before, a.before - a.qty);
      }

    } catch {}

    return { success: true, remainingAmount: totalAmount };
  } catch (e) {
    // 주문 생성이 끝까지 못 갔으면 차감한 재고를 원래대로
    if (!createdOrderId) {
      for (const a of applied) await adjustStock(a.productId, a.qty, "취소복원", newOrderId);
    }
    return { success: false, error: e instanceof Error ? e.message : "주문 처리 중 오류가 발생했어요" };
  }
}

async function currentStock(productId: string): Promise<number | null> {
  const { data } = await supabase.from("product").select("stock_qty").eq("id", productId).maybeSingle();
  return data?.stock_qty ?? null;
}
