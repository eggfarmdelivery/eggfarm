"use server";

import { createClient } from "@/lib/supabase/server";
import { encryptSensitive } from "@/lib/crypto";

export async function submitOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요");

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const deliveryZoneId = String(formData.get("delivery_zone_id") ?? "");
  const address = String(formData.get("address") ?? "").trim();
  const entrancePasswordRaw = String(formData.get("entrance_password") ?? "").trim();

  if (!name || !phone || !deliveryZoneId || !address) {
    throw new Error("필수 항목을 모두 입력해주세요");
  }

  const kakaoUserId = user.user_metadata?.provider_id ?? null;

  const { error } = await supabase.from("account").insert({
    role: "b2c",
    auth_user_id: user.id,
    kakao_user_id: kakaoUserId,
    name,
    phone,
    delivery_zone_id: deliveryZoneId,
    address,
    entrance_password: entrancePasswordRaw ? encryptSensitive(entrancePasswordRaw) : null,
  });

  if (error) throw new Error(error.message);
  return { success: true as const };
}
