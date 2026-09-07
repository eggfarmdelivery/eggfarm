import { supabase } from "@/lib/supabase";

export type LimitCheckResult = {
  allowed: boolean;
  isOverflow: boolean;
  reason?: string;
};

// 상품별 현재 적용중인 한도(가장 최근 effective_date <= 오늘) 조회
export async function getCurrentLimit(productId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("product_limit_schedule")
    .select("stock_limit, overflow_rate, per_person_limit, effective_date")
    .eq("product_id", productId)
    .lte("effective_date", today)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// 현재 한도 적용 시작일 이후 판매된 수량(B2C+B2B 합산, 취소 제외)
async function getSoldSince(productId: string, sinceDate: string) {
  const { data: b2c } = await supabase
    .from("b2c_order_item")
    .select("quantity, b2c_order!inner(status, created_at)")
    .eq("product_id", productId)
    .gte("b2c_order.created_at", sinceDate)
    .neq("b2c_order.status", "취소");

  const { data: b2b } = await supabase
    .from("b2b_order_item")
    .select("quantity, b2b_order!inner(status, created_at)")
    .eq("product_id", productId)
    .gte("b2b_order.created_at", sinceDate)
    .neq("b2b_order.status", "취소");

  const sumB2c = (b2c ?? []).reduce((s, r) => s + r.quantity, 0);
  const sumB2b = (b2b ?? []).reduce((s, r) => s + r.quantity, 0);
  return sumB2c + sumB2b;
}

// 화면에 보여줄 잔여재고(기준재고 기준, 초과허용분은 표시에 포함 안 함) - null이면 한도 미설정(무제한)
export async function getRemainingStock(productId: string): Promise<number | null> {
  const limit = await getCurrentLimit(productId);
  if (!limit) return null;
  const sold = await getSoldSince(productId, limit.effective_date);
  return Math.max(0, limit.stock_limit - sold);
}

// 완전 소진 여부(초과허용분까지 다 팔렸는지) - 화면에 "품절" 표시용
export async function isSoldOut(productId: string): Promise<boolean> {
  const limit = await getCurrentLimit(productId);
  if (!limit) return false; // 한도 미설정 상품은 품절 개념 없음
  const sold = await getSoldSince(productId, limit.effective_date);
  const maxWithOverflow = Math.floor(limit.stock_limit * (1 + limit.overflow_rate));
  return sold >= maxWithOverflow;
}

// 기존 주문 수량 변경 시 체크(늘릴 때만 재고 재검사, 줄일 때는 항상 허용)
export async function checkQuantityChange(
  productId: string,
  oldQty: number,
  newQty: number
): Promise<LimitCheckResult> {
  if (newQty <= oldQty) return { allowed: true, isOverflow: false };

  const limit = await getCurrentLimit(productId);
  if (!limit) return { allowed: true, isOverflow: false };

  if (limit.per_person_limit && newQty > limit.per_person_limit) {
    return {
      allowed: false,
      isOverflow: false,
      reason: `1인당 최대 ${limit.per_person_limit}판까지 주문 가능해요`,
    };
  }

  const delta = newQty - oldQty;
  const sold = await getSoldSince(productId, limit.effective_date);
  const maxWithOverflow = Math.floor(limit.stock_limit * (1 + limit.overflow_rate));

  if (sold + delta <= limit.stock_limit) return { allowed: true, isOverflow: false };
  if (sold + delta <= maxWithOverflow) return { allowed: true, isOverflow: true };
  return { allowed: false, isOverflow: false, reason: "재고가 부족해서 수량을 늘릴 수 없어요" };
}
// 주문 수량이 한도상 허용되는지 확인. 기준 이하=자동진행, 기준~기준*(1+초과허용)=승인대기, 초과=거절
export async function checkLimit(
  productId: string,
  requestedQty: number
): Promise<LimitCheckResult> {
  const limit = await getCurrentLimit(productId);
  if (!limit) return { allowed: true, isOverflow: false }; // 한도 미설정 상품은 제한 없음

  if (limit.per_person_limit && requestedQty > limit.per_person_limit) {
    return {
      allowed: false,
      isOverflow: false,
      reason: `1인당 최대 ${limit.per_person_limit}판까지 주문 가능해요`,
    };
  }

  const sold = await getSoldSince(productId, limit.effective_date);
  const maxWithOverflow = Math.floor(limit.stock_limit * (1 + limit.overflow_rate));

  if (sold + requestedQty <= limit.stock_limit) {
    return { allowed: true, isOverflow: false };
  }
  if (sold + requestedQty <= maxWithOverflow) {
    return { allowed: true, isOverflow: true };
  }
  return { allowed: false, isOverflow: false, reason: "재고가 모두 소진됐어요" };
}
