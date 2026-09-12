"use server";

import { supabase } from "@/lib/supabase";
import { getApprovedB2BAccountId } from "@/lib/getAccount";

type Result = { success: true } | { success: false; error: string };

export async function cancelB2BOrder(orderId: string): Promise<Result> {
  try {
    const accountId = await getApprovedB2BAccountId();
    const { data: order, error: fetchError } = await supabase
      .from("b2b_order")
      .select("id, account_id, status")
      .eq("id", orderId)
      .single();
    if (fetchError || !order) throw new Error("발주를 찾을 수 없어요");
    if (order.account_id !== accountId) throw new Error("본인 발주만 취소할 수 있어요");
    if (order.status !== "발주요청") throw new Error("이미 배송이 시작된 발주는 취소할 수 없어요. 에그팜으로 문의해주세요");

    const { error } = await supabase.from("b2b_order").update({ status: "취소" }).eq("id", orderId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as any).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return { success: false, error: e instanceof Error ? e.message : "취소 중 오류가 발생했어요" };
  }
}
