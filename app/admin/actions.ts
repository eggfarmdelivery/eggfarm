"use server";

import { supabase } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";
import { logStatusChange } from "@/lib/statusLog";

type Result = { success: true } | { success: false; error: string };

async function uploadDeliveryPhoto(orderId: string, file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${orderId}-${Date.now()}.${ext}`;
  const { error } = await admin.storage
    .from("delivery-photos")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(`사진 업로드 실패: ${error.message}`);
  const { data } = admin.storage.from("delivery-photos").getPublicUrl(path);
  return data.publicUrl;
}

async function updateB2CStatus(orderId: string, from: string | null, to: string, extra: Record<string, unknown> = {}) {
  const { error } = await supabase.from("b2c_order").update({ status: to, ...extra }).eq("id", orderId);
  if (error) throw new Error(error.message);
  await logStatusChange("b2c_order", orderId, from, to);
}

async function updateB2BStatus(orderId: string, from: string | null, to: string, extra: Record<string, unknown> = {}) {
  const { error } = await supabase.from("b2b_order").update({ status: to, ...extra }).eq("id", orderId);
  if (error) throw new Error(error.message);
  await logStatusChange("b2b_order", orderId, from, to);
}

export async function approveOverflow(orderId: string): Promise<Result> {
  try {
    await requireAdmin();
    const { error } = await supabase
      .from("b2c_order")
      .update({ is_overflow: false, approved_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

export async function rejectOverflow(orderId: string): Promise<Result> {
  try {
    await requireAdmin();
    await updateB2CStatus(orderId, null, "승인거절");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

export async function confirmB2CPayment(orderId: string): Promise<Result> {
  try {
    await requireAdmin();
    await updateB2CStatus(orderId, "입금대기", "입금확인완료", {
      payment_confirmed_at: new Date().toISOString(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

export async function startB2CDelivery(orderId: string): Promise<Result> {
  try {
    await requireAdmin();
    await updateB2CStatus(orderId, "입금확인완료", "배송준비");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

export async function markB2CDelivered(formData: FormData): Promise<Result> {
  try {
    await requireAdmin();
    const orderId = String(formData.get("order_id"));
    const file = formData.get("photo") as File | null;
    const photoUrl = file ? await uploadDeliveryPhoto(orderId, file) : null;

    await updateB2CStatus(orderId, "배송준비", "배송완료", {
      delivery_photo_url: photoUrl,
      delivery_completed_at: new Date().toISOString(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

export async function startB2BDelivery(orderId: string): Promise<Result> {
  try {
    await requireAdmin();
    await updateB2BStatus(orderId, "발주요청", "배송중");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

// 선배송후정산: 배송완료 처리하면 자동으로 입금대기로 넘어감 (+ 카톡알림은 카카오 연동 후 추가 예정)
export async function markB2BDelivered(formData: FormData): Promise<Result> {
  try {
    await requireAdmin();
    const orderId = String(formData.get("order_id"));
    const file = formData.get("photo") as File | null;
    const photoUrl = file ? await uploadDeliveryPhoto(orderId, file) : null;

    await updateB2BStatus(orderId, "배송중", "입금대기", {
      delivery_photo_url: photoUrl,
      delivery_completed_at: new Date().toISOString(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

export async function confirmB2BPayment(orderId: string): Promise<Result> {
  try {
    await requireAdmin();
    await updateB2BStatus(orderId, "입금대기", "입금확인완료", {
      payment_confirmed_at: new Date().toISOString(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

// ---------------------------------------------------------
// 상태 되돌리기(오조작 방지) - 정해진 이전 단계로만 되돌릴 수 있음
// ---------------------------------------------------------
const B2C_REVERT: Record<string, string> = {
  입금확인완료: "입금대기",
  배송준비: "입금확인완료",
  배송완료: "배송준비",
  승인거절: "입금대기",
};
const B2B_REVERT: Record<string, string> = {
  배송중: "발주요청",
  입금대기: "배송중",
  입금확인완료: "입금대기",
};

export async function revertB2CStatus(orderId: string): Promise<Result> {
  try {
    await requireAdmin();
    const { data: order, error: fetchError } = await supabase
      .from("b2c_order")
      .select("status")
      .eq("id", orderId)
      .single();
    if (fetchError || !order) throw new Error("주문을 찾을 수 없어요");
    const target = B2C_REVERT[order.status];
    if (!target) throw new Error("이 상태는 되돌릴 수 없어요");
    await updateB2CStatus(orderId, order.status, target);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

export async function revertB2BStatus(orderId: string): Promise<Result> {
  try {
    await requireAdmin();
    const { data: order, error: fetchError } = await supabase
      .from("b2b_order")
      .select("status")
      .eq("id", orderId)
      .single();
    if (fetchError || !order) throw new Error("발주를 찾을 수 없어요");
    const target = B2B_REVERT[order.status];
    if (!target) throw new Error("이 상태는 되돌릴 수 없어요");
    await updateB2BStatus(orderId, order.status, target);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

// ---------------------------------------------------------
// 계좌환불 완료 처리 (사용자가 "계좌로 환불받기"를 선택한 경우, 관리자가 실제 이체 후 처리)
// ---------------------------------------------------------
export async function confirmBankRefund(orderId: string): Promise<Result> {
  try {
    await requireAdmin();
    await updateB2CStatus(orderId, "환불대기", "환불완료", {
      refund_completed_at: new Date().toISOString(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}
