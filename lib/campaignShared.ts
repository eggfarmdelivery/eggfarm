// 캠페인 관련 "순수" 타입/함수만 모아둔 파일 - DB 접근(supabase) 코드가 전혀 없어서
// 클라이언트 컴포넌트("use client")에서 import해도 안전함.
// DB 조회가 필요한 함수는 lib/campaign.ts(서버 전용)에 있음

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

export type CampaignLimitCheckResult = { allowed: boolean; reason?: string };

export function calculateDeliveryFee(
  campaign: { delivery_fee: number; free_shipping_min_qty: number },
  totalQty: number
): number {
  if (totalQty >= campaign.free_shipping_min_qty) return 0;
  return campaign.delivery_fee;
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
