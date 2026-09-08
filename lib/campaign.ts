import { supabase } from "@/lib/supabase";
import { isSoldOut } from "@/lib/limits";

export type Campaign = {
  id: string;
  closes_at: string;
  closed_early_at: string | null;
  created_at: string;
};

export type CampaignStatus =
  | "none" // 캠페인이 아예 없음(아직 한 번도 오픈 안 함)
  | "open"
  | "closed_deadline" // 정상 마감(마감시각 도래)
  | "closed_early_manual" // 관리자가 수동 조기마감
  | "closed_early_stock"; // 재고소진으로 조기마감(자동, 상태값은 저장 안 하고 매번 계산)

// 항상 가장 최근에 생성된 캠페인 1건만 "현재 캠페인"으로 취급
export async function getCurrentCampaign(): Promise<Campaign | null> {
  const { data } = await supabase
    .from("campaign")
    .select("id, closes_at, closed_early_at, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// activeProductIds: 현재 판매중인(is_active) 상품 id 목록 - 전부 품절이면 재고소진 조기마감으로 판단
export async function getCampaignStatus(
  campaign: Campaign | null,
  activeProductIds: string[]
): Promise<CampaignStatus> {
  if (!campaign) return "none";
  if (campaign.closed_early_at) return "closed_early_manual";
  if (new Date(campaign.closes_at) <= new Date()) return "closed_deadline";

  if (activeProductIds.length > 0) {
    const soldOutFlags = await Promise.all(activeProductIds.map((id) => isSoldOut(id)));
    if (soldOutFlags.every(Boolean)) return "closed_early_stock";
  }

  return "open";
}

export function isOpenStatus(status: CampaignStatus): boolean {
  return status === "open";
}

export function statusLabel(status: CampaignStatus): string {
  switch (status) {
    case "closed_deadline":
      return "주문마감";
    case "closed_early_manual":
    case "closed_early_stock":
      return "조기마감";
    default:
      return "";
  }
}
