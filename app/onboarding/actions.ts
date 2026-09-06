"use server";

import { createClient } from "@/lib/supabase/server";
import { encryptSensitive } from "@/lib/crypto";

export async function submitOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요");

  const role = formData.get("role") === "b2b" ? "b2b" : "b2c";
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const kakaoUserId = user.user_metadata?.provider_id ?? null;

  if (!name || !phone || !address) {
    throw new Error("필수 항목을 모두 입력해주세요");
  }

  if (role === "b2c") {
    const deliveryZoneId = String(formData.get("delivery_zone_id") ?? "");
    const entrancePasswordRaw = String(formData.get("entrance_password") ?? "").trim();
    if (!deliveryZoneId) throw new Error("배송 단지를 선택해주세요");

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

  const businessName = String(formData.get("business_name") ?? "").trim();
  if (!businessName) throw new Error("업체명을 입력해주세요");

  const { error } = await supabase.from("account").insert({
    role: "b2b",
    auth_user_id: user.id,
    kakao_user_id: kakaoUserId,
    business_name: businessName,
    name,
    phone,
    address,
  });
  if (error) throw new Error(error.message);
  return { success: true as const };
}
