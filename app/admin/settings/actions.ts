"use server";

import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

type Result = { success: true } | { success: false; error: string };

export async function updateSettings(formData: FormData): Promise<Result> {
  try {
    await requireAdmin();
    const entries: [string, string][] = [
      ["bank_name", String(formData.get("bank_name") ?? "").trim()],
      ["bank_account", String(formData.get("bank_account") ?? "").trim()],
      ["bank_holder", String(formData.get("bank_holder") ?? "").trim()],
      ["kakao_openchat_url", String(formData.get("kakao_openchat_url") ?? "").trim()],
      ["notice_enabled", formData.get("notice_enabled") === "on" ? "true" : "false"],
      ["notice_text", String(formData.get("notice_text") ?? "").trim()],
    ];

    for (const [key, value] of entries) {
      const { error } = await supabase.from("system_config").upsert({ key, value });
      if (error) throw new Error(error.message);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "저장 중 오류가 발생했어요" };
  }
}
