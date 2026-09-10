import { supabase } from "@/lib/supabase";

export type Campaign = {
  id: string;
  title: string | null;
  photo_url: string | null;
  opens_at: string;
  closes_at: string;
  closed_early_at: string | null;
  delivery_date: string | null;
  delivery_fee: number;
  free_shipping_min_qty: number;
  created_at: string;
};

export type CampaignProductLimit = {
  product_id: string;
  stock_limit: number;
  per_person_limit: number | null;
};

export type CampaignStatus =
  | "not_yet_open" // 오픈 일시가 아직 안 됨
  | "open"
  | "closed_deadline" // 정상 마감(마감시각 도래)
  | "closed_early_manual" // 관리자가 수동 조기마감
  | "closed_early_stock"; // 재고소진으로 조기마감(자동, 상태값은 저장 안 하고 매번 계산)

// 여러 캠페인을 동시에 운영할 수 있음 - 전체 목록(관리자용, 최신순)
export async function getAllCampaigns(): Promise<Campaign[]> {
  const { data } = await supabase
    .from("campaign")
    .select(
      "id, title, photo_url, opens_at, closes_at, closed_early_at, delivery_date, delivery_fee, free_shipping_min_qty, created_at"
    )
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const { data } = await supabase
    .from("campaign")
    .select(
      "id, title, photo_url, opens_at, closes_at, closed_early_at, delivery_date, delivery_fee, free_shipping_min_qty, created_at"
    )
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

// 캠페인에 포함된 상품 + 그 캠페인 전용 재고상한/인당제한
export function calculateDeliveryFee(
  campaign: { delivery_fee: number; free_shipping_min_qty: number },
  totalQty: number
): number {
  if (totalQty >= campaign.free_shipping_min_qty) return 0;
  return campaign.delivery_fee;
}

export async function getCampaignProductLimits(
  campaignId: string
): Promise<CampaignProductLimit[]> {
  const { data } = await supabase
    .from("campaign_product")
    .select("product_id, stock_limit, per_person_limit")
    .eq("campaign_id", campaignId);
  return data ?? [];
}

export async function getCampaignProductIds(campaignId: string): Promise<string[]> {
  const limits = await getCampaignProductLimits(campaignId);
  return limits.map((l) => l.product_id);
}

// 이 캠페인 안에서 지금까지 팔린 수량(취소 제외) - 재고/한도는 캠페인별로 완전히 독립
// (조인된 테이블 컬럼으로 필터링하는 대신, 이 캠페인의 주문id를 먼저 뽑아 명확하게 필터링)
export async function getCampaignSold(campaignId: string, productId: string): Promise<number> {
  const { data: orders } = await supabase
    .from("b2c_order")
    .select("id")
    .eq("campaign_id", campaignId)
    .neq("status", "취소")
    .neq("status", "환불대기")
    .neq("status", "환불완료");
  const orderIds = (orders ?? []).map((o) => o.id);
  if (orderIds.length === 0) return 0;

  const { data: items } = await supabase
    .from("b2c_order_item")
    .select("quantity")
    .eq("product_id", productId)
    .in("order_id", orderIds);
  return (items ?? []).reduce((s, r) => s + r.quantity, 0);
}

export async function getCampaignRemainingStock(
  campaignId: string,
  productId: string,
  stockLimit: number
): Promise<number> {
  const sold = await getCampaignSold(campaignId, productId);
  return Math.max(0, stockLimit - sold);
}

export async function isCampaignProductSoldOut(
  campaignId: string,
  productId: string,
  stockLimit: number
): Promise<boolean> {
  const sold = await getCampaignSold(campaignId, productId);
  return sold >= stockLimit;
}

export type CampaignLimitCheckResult = { allowed: boolean; reason?: string };

// 주문 시 캠페인 재고/인당제한 검사(초과허용 없이 하드캡)
export async function checkCampaignLimit(
  campaignId: string,
  limit: CampaignProductLimit,
  requestedQty: number
): Promise<CampaignLimitCheckResult> {
  if (limit.per_person_limit && requestedQty > limit.per_person_limit) {
    return {
      allowed: false,
      reason: `1인당 최대 ${limit.per_person_limit}판까지 주문 가능해요`,
    };
  }
  const sold = await getCampaignSold(campaignId, limit.product_id);
  if (sold + requestedQty > limit.stock_limit) {
    return { allowed: false, reason: "재고가 모두 소진됐어요" };
  }
  return { allowed: true };
}

// 이미 존재하는 주문의 수량을 바꿀 때 검사 - sold에는 이 주문의 기존 수량이 이미 포함돼있으므로
// 증가분(delta)만큼만 재고에 추가로 반영해서 검사함(이중계산 방지)
export async function checkCampaignQuantityChange(
  campaignId: string,
  limit: CampaignProductLimit,
  oldQty: number,
  newQty: number
): Promise<CampaignLimitCheckResult> {
  if (newQty <= oldQty) return { allowed: true };
  if (limit.per_person_limit && newQty > limit.per_person_limit) {
    return {
      allowed: false,
      reason: `1인당 최대 ${limit.per_person_limit}판까지 주문 가능해요`,
    };
  }
  const sold = await getCampaignSold(campaignId, limit.product_id);
  const delta = newQty - oldQty;
  if (sold + delta > limit.stock_limit) {
    return { allowed: false, reason: "재고가 모두 소진됐어요" };
  }
  return { allowed: true };
}

export async function getCampaignStatus(
  campaign: Campaign,
  productLimits: CampaignProductLimit[]
): Promise<CampaignStatus> {
  if (campaign.closed_early_at) return "closed_early_manual";
  const now = new Date();
  if (new Date(campaign.opens_at) > now) return "not_yet_open";
  if (new Date(campaign.closes_at) <= now) return "closed_deadline";

  if (productLimits.length > 0) {
    const soldOutFlags = await Promise.all(
      productLimits.map((l) => isCampaignProductSoldOut(campaign.id, l.product_id, l.stock_limit))
    );
    if (soldOutFlags.every(Boolean)) return "closed_early_stock";
  }

  return "open";
}

export function isOpenStatus(status: CampaignStatus): boolean {
  return status === "open";
}

export function statusLabel(status: CampaignStatus): string {
  switch (status) {
    case "not_yet_open":
      return "오픈 예정";
    case "closed_deadline":
      return "주문마감";
    case "closed_early_manual":
    case "closed_early_stock":
      return "조기마감";
    default:
      return "";
  }
}

// 캠페인에 지정된 배송가능 단지 id 목록 (반드시 1개 이상 지정됨)
export async function getCampaignZoneIds(campaignId: string): Promise<string[]> {
  const { data } = await supabase
    .from("campaign_zone")
    .select("delivery_zone_id")
    .eq("campaign_id", campaignId);
  return (data ?? []).map((r) => r.delivery_zone_id);
}

// 지금 실제로 주문 가능한(오픈중) 캠페인들 - 구매자 홈 카드용, 여러 개 동시 노출 가능
// zoneId가 주어지면 그 단지가 지정된 캠페인만 반환(단지 미포함 캠페인은 아예 안 보임)
export async function getOpenCampaigns(
  zoneId?: string | null
): Promise<{ campaign: Campaign; productLimits: CampaignProductLimit[] }[]> {
  const all = await getAllCampaigns();
  const result: { campaign: Campaign; productLimits: CampaignProductLimit[] }[] = [];
  for (const campaign of all) {
    if (zoneId) {
      const zoneIds = await getCampaignZoneIds(campaign.id);
      if (!zoneIds.includes(zoneId)) continue;
    }
    const productLimits = await getCampaignProductLimits(campaign.id);
    const status = await getCampaignStatus(campaign, productLimits);
    if (status === "open") result.push({ campaign, productLimits });
  }
  return result;
}

// 최근 N일 이내 생성된 캠페인 전부(마감/조기마감 포함) - 구매자 홈에서 "운영 이력"을 보여주기 위함
// zoneId가 주어지면 그 단지가 지정된 캠페인만 반환
export async function getRecentCampaigns(
  days = 7,
  zoneId?: string | null
): Promise<
  { campaign: Campaign; productLimits: CampaignProductLimit[]; status: CampaignStatus }[]
> {
  const all = await getAllCampaigns();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = all.filter((c) => new Date(c.created_at).getTime() >= cutoff);
  const result: {
    campaign: Campaign;
    productLimits: CampaignProductLimit[];
    status: CampaignStatus;
  }[] = [];
  for (const campaign of recent) {
    if (zoneId) {
      const zoneIds = await getCampaignZoneIds(campaign.id);
      if (!zoneIds.includes(zoneId)) continue;
    }
    const productLimits = await getCampaignProductLimits(campaign.id);
    const status = await getCampaignStatus(campaign, productLimits);
    result.push({ campaign, productLimits, status });
  }
  return result;
}
