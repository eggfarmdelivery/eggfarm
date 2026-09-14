"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/adminAuth";

type Result = { success: true } | { success: false; error: string };

export type AdminStaffRow = {
  id: string;
  kakao_id: string;
  label: string | null;
  permission: "payment" | "delivery";
  created_at: string;
};

export async function listAdminStaff(): Promise<AdminStaffRow[]> {
  await requireOwner();
  const admin = createAdminClient();
  const { data } = await admin.from("admin_staff").select("*").order("created_at", { ascending: false });
  return (data as AdminStaffRow[]) ?? [];
}

export async function addAdminStaff(
  kakaoId: string,
  permission: "payment" | "delivery",
  label: string
): Promise<Result> {
  try {
    await requireOwner();
    if (!kakaoId.trim()) throw new Error("카카오 ID를 입력해주세요");
    const admin = createAdminClient();
    const { error } = await admin
      .from("admin_staff")
      .insert({ kakao_id: kakaoId.trim(), permission, label: label.trim() || null });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "등록 중 오류가 발생했어요" };
  }
}

export async function removeAdminStaff(id: string): Promise<Result> {
  try {
    await requireOwner();
    const admin = createAdminClient();
    const { error } = await admin.from("admin_staff").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "삭제 중 오류가 발생했어요" };
  }
}
