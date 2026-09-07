"use server";

import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

type Result = { success: true } | { success: false; error: string };

export async function markSettlementTransferred(
  accountId: string,
  settlementMonth: string,
  totalAmount: number
): Promise<Result> {
  try {
    await requireAdmin();
    const { error } = await supabase.from("b2b_settlement").upsert(
      {
        account_id: accountId,
        settlement_month: settlementMonth,
        total_amount: totalAmount,
        status: "이체완료",
        transferred_at: new Date().toISOString(),
      },
      { onConflict: "account_id,settlement_month" }
    );
    if (error) throw new Error(error.message);
    // TODO: 카카오 연동 후 거래처 담당자에게 정산 알림(요약+상세링크) 발송
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}
