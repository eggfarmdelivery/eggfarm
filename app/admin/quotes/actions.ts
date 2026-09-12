"use server";

import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

type Result = { success: true } | { success: false; error: string };

export async function markQuoteReplied(id: string, reply: string): Promise<Result> {
  try {
    await requireAdmin();
    if (!reply.trim()) throw new Error("답변 내용을 입력해주세요");
    const { error } = await supabase
      .from("quote_request")
      .update({ status: "회신완료", admin_reply: reply.trim(), replied_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

export async function rejectQuote(id: string): Promise<Result> {
  try {
    await requireAdmin();
    const { error } = await supabase
      .from("quote_request")
      .update({ status: "거절", replied_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}
