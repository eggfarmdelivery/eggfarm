"use server";

import { supabase } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";

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

export async function approveOverflow(orderId: string) {
  await requireAdmin();
  const { error } = await supabase
    .from("b2c_order")
    .update({ is_overflow: false, approved_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}

export async function rejectOverflow(orderId: string) {
  await requireAdmin();
  const { error } = await supabase
    .from("b2c_order")
    .update({ status: "승인거절" })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}

export async function confirmB2CPayment(orderId: string) {
  await requireAdmin();
  const { error } = await supabase
    .from("b2c_order")
    .update({ status: "입금확인완료", payment_confirmed_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}

export async function markB2CDelivered(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("order_id"));
  const file = formData.get("photo") as File | null;
  const photoUrl = file ? await uploadDeliveryPhoto(orderId, file) : null;

  const { error } = await supabase
    .from("b2c_order")
    .update({
      status: "배송완료",
      delivery_photo_url: photoUrl,
      delivery_completed_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}

export async function startB2BDelivery(orderId: string) {
  await requireAdmin();
  const { error } = await supabase
    .from("b2b_order")
    .update({ status: "배송중" })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}

// 선배송후정산: 배송완료 처리하면 자동으로 입금대기로 넘어감 (+ 카톡알림은 카카오 연동 후 추가 예정)
export async function markB2BDelivered(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("order_id"));
  const file = formData.get("photo") as File | null;
  const photoUrl = file ? await uploadDeliveryPhoto(orderId, file) : null;

  const { error } = await supabase
    .from("b2b_order")
    .update({
      status: "입금대기",
      delivery_photo_url: photoUrl,
      delivery_completed_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}

export async function confirmB2BPayment(orderId: string) {
  await requireAdmin();
  const { error } = await supabase
    .from("b2b_order")
    .update({ status: "입금확인완료", payment_confirmed_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}
