import "server-only";
import { supabase } from "@/lib/supabase";
import { sendKakaoMemoToAdmin } from "@/lib/kakao";
import { getConfig } from "@/lib/settings";

const ADMIN_STOCK_URL = "https://eggfarm.shop/admin/stock";

// 재고를 delta만큼 바꿈(음수=차감). 재고 부족이면 ok:false. 확인과 변경은 DB 함수 안에서 한 번에 처리됨
export async function adjustStock(
  productId: string,
  delta: number,
  reason: string,
  orderId: string | null = null
): Promise<{ ok: true; qty: number } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_product: productId,
    p_delta: delta,
    p_reason: reason,
    p_order: orderId,
  });
  if (error) {
    if (String(error.message).includes("INSUFFICIENT_STOCK")) {
      return { ok: false, error: "재고가 부족해요" };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, qty: data as number };
}

// 재고가 기준 이하로 "내려가는 순간" 한 번, 품절되는 순간 한 번 알림 (이미 기준 이하면 다시 보내지 않음)
export async function notifyStockChange(productId: string, before: number, after: number) {
  if (after >= before) return;
  const threshold = Number(await getConfig("low_stock_alert_threshold")) || 10;
  const crossedZero = before > 0 && after <= 0;
  const crossedLow = before > threshold && after <= threshold && after > 0;
  if (!crossedZero && !crossedLow) return;
  const { data: p } = await supabase.from("product").select("name").eq("id", productId).maybeSingle();
  const name = p?.name ?? "상품";
  if (crossedZero) {
    await sendKakaoMemoToAdmin(
      `[에그팜 품절] ${name}이(가) 품절됐어요. 재고를 채우기 전까지 주문이 막혀 있어요.`,
      ADMIN_STOCK_URL
    );
  } else {
    await sendKakaoMemoToAdmin(
      `[에그팜 재고 부족] ${name} 재고가 ${after}판 남았어요. 입고되면 재고를 채워주세요.`,
      ADMIN_STOCK_URL
    );
  }
}

// 이 주문으로 차감된 재고 중 아직 돌려주지 않은 만큼을 복원(취소/환불 시). 여러 번 불려도 이중 복원 없음.
// 재고 기록이 없는 주문(과거 캠페인 주문, 테스트 계정 주문)은 아무것도 하지 않음
export async function restoreOrderStock(orderId: string): Promise<void> {
  const { data: logs } = await supabase
    .from("stock_log")
    .select("product_id, delta")
    .eq("order_id", orderId);
  if (!logs || logs.length === 0) return;
  const net = new Map<string, number>();
  for (const l of logs) net.set(l.product_id, (net.get(l.product_id) ?? 0) + l.delta);
  for (const [productId, sum] of net) {
    if (sum < 0) await adjustStock(productId, -sum, "취소복원", orderId);
  }
}

// 이 회원이 해당 배송일로 이미 주문한 총 수량(취소/환불 제외) - 인당 한도를 배송일 단위로 합산해서 계산
export async function getPersonQtyForDate(
  accountId: string,
  deliveryDate: string,
  excludeOrderId?: string
): Promise<number> {
  let q = supabase
    .from("b2c_order")
    .select("id, b2c_order_item(quantity)")
    .eq("account_id", accountId)
    .eq("delivery_date", deliveryDate)
    .neq("status", "취소")
    .neq("status", "환불대기")
    .neq("status", "환불완료")
    .neq("status", "승인거절");
  if (excludeOrderId) q = q.neq("id", excludeOrderId);
  const { data } = await q;
  let total = 0;
  for (const o of (data ?? []) as any[]) {
    for (const i of o.b2c_order_item ?? []) total += i.quantity;
  }
  return total;
}

export async function isTestAccount(accountId: string): Promise<boolean> {
  const { data } = await supabase.from("account").select("is_test").eq("id", accountId).maybeSingle();
  return !!data?.is_test;
}
