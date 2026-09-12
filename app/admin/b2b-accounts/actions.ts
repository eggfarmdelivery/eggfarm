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

// 거래처가 발주 화면에서 볼 수 있는 상품과 단가를 관리 - 여기 등록 안 된 상품은 그 거래처 발주화면에 아예 안 보임
export async function setB2BAccountPrices(
  accountId: string,
  items: { productId: string; enabled: boolean; price: number }[]
): Promise<Result> {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    for (const item of items) {
      if (item.enabled) {
        if (!item.price || item.price <= 0) throw new Error("단가를 올바르게 입력해주세요");
        const { error } = await admin
          .from("b2b_account_price")
          .upsert(
            { account_id: accountId, product_id: item.productId, price: item.price },
            { onConflict: "account_id,product_id" }
          );
        if (error) throw new Error(error.message);
      } else {
        const { error } = await admin
          .from("b2b_account_price")
          .delete()
          .eq("account_id", accountId)
          .eq("product_id", item.productId);
        if (error) throw new Error(error.message);
      }
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}
