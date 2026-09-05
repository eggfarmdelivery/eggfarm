"use server";

import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

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

export async function markB2CDelivered(orderId: string, photoUrl: string) {
  await requireAdmin();
  const { error } = await supabase
    .from("b2c_order")
    .update({
      status: "배송완료",
      delivery_photo_url: photoUrl || null,
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
export async function markB2BDelivered(orderId: string, photoUrl: string) {
  await requireAdmin();
  const { error } = await supabase
    .from("b2b_order")
    .update({
      status: "입금대기",
      delivery_photo_url: photoUrl || null,
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
