import { supabase } from "@/lib/supabase";

// TODO: 카카오 로그인 붙으면 이 파일은 제거하고 실제 세션에서 account_id를 가져오도록 교체
// 지금은 로그인 없이 화면을 테스트할 수 있도록 고정된 데모 계정을 하나씩 만들어 재사용합니다.

export async function getOrCreateDemoAccount(role: "b2c" | "b2b") {
  const kakaoUserId = role === "b2c" ? "demo-b2c-1" : "demo-b2b-1";

  const { data: existing } = await supabase
    .from("account")
    .select("id")
    .eq("kakao_user_id", kakaoUserId)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: zone } = await supabase
    .from("delivery_zone")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("account")
    .insert({
      role,
      kakao_user_id: kakaoUserId,
      name: role === "b2c" ? "테스트 회원" : "테스트 거래처",
      business_name: role === "b2b" ? "테스트 매장" : null,
      delivery_zone_id: role === "b2c" ? zone?.id ?? null : null,
    })
    .select("id")
    .single();

  if (error || !created) throw new Error(error?.message ?? "계정 생성 실패");
  return created.id as string;
}
