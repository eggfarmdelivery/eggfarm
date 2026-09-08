import { supabase } from "@/lib/supabase";
import { isSoldOut } from "@/lib/limits";

export type Campaign = {
  id: string;
  title: string | null;
  photo_url: string | null;
  opens_at: string;
  closes_at: string;
  closed_early_at: string | null;
  created_at: string;
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
    .select("id, title, photo_url, opens_at, closes_at, closed_early_at, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const { data } = await supabase
    .from("campaign")
    .select("id, title, photo_url, opens_at, closes_at, closed_early_at, created_at")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

// 캠페인에 포함된 상품 id 목록
export async function getCampaignProductIds(campaignId: string): Promise<string[]> {
  const { data } = await supabase
    .from("campaign_product")
    .select("product_id")
    .eq("campaign_id", campaignId);
  return (data ?? []).map((r) => r.product_id);
}

export async function getCampaignStatus(
  campaign: Campaign,
  productIds: string[]
): Promise<CampaignStatus> {
  if (campaign.closed_early_at) return "closed_early_manual";
  const now = new Date();
  if (new Date(campaign.opens_at) > now) return "not_yet_open";
  if (new Date(campaign.closes_at) <= now) return "closed_deadline";

  if (productIds.length > 0) {
    const soldOutFlags = await Promise.all(productIds.map((id) => isSoldOut(id)));
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

// 지금 실제로 주문 가능한(오픈중) 캠페인들 - 구매자 홈 카드용, 여러 개 동시 노출 가능
export async function getOpenCampaigns(): Promise<
  { campaign: Campaign; productIds: string[] }[]
> {
  const all = await getAllCampaigns();
  const result: { campaign: Campaign; productIds: string[] }[] = [];
  for (const campaign of all) {
    const productIds = await getCampaignProductIds(campaign.id);
    const status = await getCampaignStatus(campaign, productIds);
    if (status === "open") result.push({ campaign, productIds });
  }
  return result;
}

// 최근 N일 이내 생성된 캠페인 전부(마감/조기마감 포함) - 구매자 홈에서 "운영 이력"을 보여주기 위함
export async function getRecentCampaigns(
  days = 7
): Promise<{ campaign: Campaign; productIds: string[]; status: CampaignStatus }[]> {
  const all = await getAllCampaigns();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = all.filter((c) => new Date(c.created_at).getTime() >= cutoff);
  const result: { campaign: Campaign; productIds: string[]; status: CampaignStatus }[] = [];
  for (const campaign of recent) {
    const productIds = await getCampaignProductIds(campaign.id);
    const status = await getCampaignStatus(campaign, productIds);
    result.push({ campaign, productIds, status });
  }
  return result;
}
