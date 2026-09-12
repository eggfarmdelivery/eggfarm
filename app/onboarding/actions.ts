"use server";

import { createClient } from "@/lib/supabase/server";
import { encryptSensitive } from "@/lib/crypto";
import { byteLength, NICKNAME_MAX_BYTES } from "@/lib/nickname";

type Result = { success: true } | { success: false; error: string };

export async function submitOnboarding(formData: FormData): Promise<Result> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요해요");

    const role = formData.get("role") === "b2b" ? "b2b" : "b2c";
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const nickname = String(formData.get("nickname") ?? "").trim();
    const kakaoUserId = user.user_metadata?.provider_id ?? null;

    if (!name || !phone || !address) {
      throw new Error("필수 항목을 모두 입력해주세요");
    }
    if (role === "b2c") {
      if (!nickname) throw new Error("닉네임을 입력해주세요");
      if (byteLength(nickname) > NICKNAME_MAX_BYTES) {
        throw new Error("닉네임이 너무 길어요. 한글 6자(영문은 12자) 이내로 입력해주세요");
      }
    }

    if (role === "b2c") {
      const deliveryZoneId = String(formData.get("delivery_zone_id") ?? "").trim();
      const addressDong = String(formData.get("address_dong") ?? "").trim();
      const addressHo = String(formData.get("address_ho") ?? "").trim();
      const entrancePasswordRaw = String(formData.get("entrance_password") ?? "").trim();

      if (!deliveryZoneId) throw new Error("배송가능 단지를 선택해주세요");

      const { error } = await supabase.from("account").insert({
        role: "b2c",
        auth_user_id: user.id,
        kakao_user_id: kakaoUserId,
        name,
        phone,
        nickname,
        address,
        delivery_zone_id: deliveryZoneId,
        address_dong: addressDong || null,
        address_ho: addressHo || null,
        entrance_password: entrancePasswordRaw ? encryptSensitive(entrancePasswordRaw) : null,
      });
      if (error) throw new Error(error.message);
      return { success: true };
    }

    const businessName = String(formData.get("business_name") ?? "").trim();
    const businessNumber = String(formData.get("business_number") ?? "").trim();
    const businessType = String(formData.get("business_type") ?? "").trim();
    const entrancePasswordRaw = String(formData.get("entrance_password") ?? "").trim();
    if (!businessName) throw new Error("업체명을 입력해주세요");
    if (!businessNumber) throw new Error("사업자등록번호를 입력해주세요");
    if (!businessType) throw new Error("사업자구분을 선택해주세요");

    const { error } = await supabase.from("account").insert({
      role: "b2b",
      auth_user_id: user.id,
      kakao_user_id: kakaoUserId,
      business_name: businessName,
      business_number: businessNumber,
      business_type: businessType,
      approval_status: "pending",
      name,
      phone,
      address,
      entrance_password: entrancePasswordRaw ? encryptSensitive(entrancePasswordRaw) : null,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "저장 중 오류가 발생했어요" };
  }
}
