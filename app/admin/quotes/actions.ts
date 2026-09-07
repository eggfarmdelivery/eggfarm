"use server";

import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

type Result = { success: true } | { success: false; error: string };

export async function markQuoteReplied(id: string): Promise<Result> {
  try {
    await requireAdmin();
    const { error } = await supabase
      .from("quote_request")
      .update({ status: "회신완료" })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}
