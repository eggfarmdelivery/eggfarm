"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitB2BOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요");

  const businessName = String(formData.get("business_name") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!businessName || !name || !phone || !address) {
    throw new Error("필수 항목을 모두 입력해주세요");
  }

  const kakaoUserId = user.user_metadata?.provider_id ?? null;

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
