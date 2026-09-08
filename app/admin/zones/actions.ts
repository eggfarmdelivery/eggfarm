"use server";

import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

type Result = { success: true } | { success: false; error: string };

export async function createZone(formData: FormData): Promise<Result> {
  try {
    await requireAdmin();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) throw new Error("단지명을 입력해주세요");

    const { error } = await supabase.from("delivery_zone").insert({ name });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "등록 중 오류가 발생했어요" };
  }
}

export async function toggleZoneActive(zoneId: string, isActive: boolean): Promise<Result> {
  try {
    await requireAdmin();
    const { error } = await supabase
      .from("delivery_zone")
      .update({ is_active: isActive })
      .eq("id", zoneId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}
