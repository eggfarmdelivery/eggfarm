"use server";

import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

export async function markSettlementTransferred(
  accountId: string,
  settlementMonth: string,
  totalAmount: number
) {
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
}
