"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";

type Result = { success: true } | { success: false; error: string };

export async function approveB2BAccount(accountId: string): Promise<Result> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin
      .from("account")
      .update({ approval_status: "approved", rejection_reason: null })
      .eq("id", accountId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

export async function rejectB2BAccount(accountId: string, reason: string): Promise<Result> {
  try {
    await requireAdmin();
    if (!reason.trim()) throw new Error("거절 사유를 입력해주세요");
    const admin = createAdminClient();
    const { error } = await admin
      .from("account")
      .update({ approval_status: "rejected", rejection_reason: reason.trim() })
      .eq("id", accountId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

// 승인된 거래처를 나중에 비활성화(거래중단)하거나, 비활성 상태를 다시 승인으로 되돌릴 때 사용
export async function setB2BAccountStatus(
  accountId: string,
  status: "approved" | "inactive"
): Promise<Result> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from("account").update({ approval_status: status }).eq("id", accountId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

export async function updateB2BAccountNote(accountId: string, note: string): Promise<Result> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from("account").update({ admin_note: note.trim() || null }).eq("id", accountId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

export async function toggleTaxInvoiceNeeded(accountId: string, needed: boolean): Promise<Result> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from("account").update({ tax_invoice_needed: needed }).eq("id", accountId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}
