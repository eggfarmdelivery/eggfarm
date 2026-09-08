"use server";

import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

type Result = { success: true } | { success: false; error: string };

// 새 캠페인 오픈 (배송 가능할 때 마감시각을 정해서 엶) - 항상 최근 생성분이 "현재 캠페인"이 됨
export async function openCampaign(closesAtLocal: string): Promise<Result> {
  try {
    await requireAdmin();
    if (!closesAtLocal) throw new Error("마감 일시를 선택해주세요");
    const closesAt = new Date(closesAtLocal);
    if (isNaN(closesAt.getTime())) throw new Error("마감 일시가 올바르지 않아요");
    if (closesAt.getTime() <= Date.now()) throw new Error("마감 일시는 현재보다 이후여야 해요");

    const { error } = await supabase.from("campaign").insert({
      closes_at: closesAt.toISOString(),
    });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "오픈 중 오류가 발생했어요" };
  }
}

// 조기마감 (관리자 수동)
export async function closeCampaignEarly(campaignId: string): Promise<Result> {
  try {
    await requireAdmin();
    const { error } = await supabase
      .from("campaign")
      .update({ closed_early_at: new Date().toISOString() })
      .eq("id", campaignId)
      .is("closed_early_at", null);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}
