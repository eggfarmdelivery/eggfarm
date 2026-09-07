"use server";

import { supabase } from "@/lib/supabase";

type Result = { success: true } | { success: false; error: string };

export async function submitQuoteRequest(formData: FormData): Promise<Result> {
  try {
    const businessName = formData.get("business_name") as string;
    const contactPhone = formData.get("contact_phone") as string;
    const content = formData.get("content") as string;

    if (!businessName || !contactPhone || !content) {
      throw new Error("모든 항목을 입력해주세요");
    }

    const { error } = await supabase.from("quote_request").insert({
      business_name: businessName,
      contact_phone: contactPhone,
      content,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "제출 중 오류가 발생했어요" };
  }
}
