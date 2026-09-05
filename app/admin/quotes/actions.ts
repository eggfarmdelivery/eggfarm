"use server";

import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

export async function markQuoteReplied(id: string) {
  await requireAdmin();
  const { error } = await supabase
    .from("quote_request")
    .update({ status: "회신완료" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
