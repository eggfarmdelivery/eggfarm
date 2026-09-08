"use server";

import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

type Result = { success: true } | { success: false; error: string };

export async function createZone(formData: FormData): Promise<Result> {
  try {
    await requireAdmin();
    const name = String(formData.get("name") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    if (!name) throw new Error("단지명을 입력해주세요");

    const { error } = await supabase.from("delivery_zone").insert({
      name,
      address: address || null,
    });
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

// 단지 삭제 - 이미 그 단지로 가입한 회원이 있으면 외래키 제약으로 실패함(비활성화만 안내)
export async function deleteZone(zoneId: string): Promise<Result> {
  try {
    await requireAdmin();
    const { error } = await supabase.from("delivery_zone").delete().eq("id", zoneId);
    if (error) {
      if (error.code === "23503") {
        throw new Error("이 단지로 가입한 회원이 있어 삭제할 수 없어요. 비활성화만 가능해요");
      }
      throw new Error(error.message);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "삭제 중 오류가 발생했어요" };
  }
}
