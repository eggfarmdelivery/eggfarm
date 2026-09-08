"use server";

import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { encryptSensitive } from "@/lib/crypto";
import { byteLength, NICKNAME_MAX_BYTES } from "@/lib/nickname";

type Result = { success: true } | { success: false; error: string };

export async function updateProfile(formData: FormData): Promise<Result> {
  try {
    const accountId = await getAccountId("b2c");
    const sessionSupabase = await createClient();

    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const nickname = String(formData.get("nickname") ?? "").trim();
    if (nickname && byteLength(nickname) > NICKNAME_MAX_BYTES) {
      throw new Error("닉네임이 너무 길어요. 한글 6자(영문은 12자) 이내로 입력해주세요");
    }
    const deliveryZoneId = String(formData.get("delivery_zone_id") ?? "").trim();
    const dong = String(formData.get("address_dong") ?? "").trim();
    const ho = String(formData.get("address_ho") ?? "").trim();
    const entrancePasswordRaw = String(formData.get("entrance_password") ?? "").trim();

    if (!name || !phone || !deliveryZoneId || !dong || !ho) {
      throw new Error("필수 항목을 모두 입력해주세요");
    }

    const { data: zone } = await supabase
      .from("delivery_zone")
      .select("name")
      .eq("id", deliveryZoneId)
      .single();
    if (!zone) throw new Error("배송가능 단지를 다시 선택해주세요");

    const { error } = await sessionSupabase
      .from("account")
      .update({
        name,
        phone,
        nickname: nickname || null,
        delivery_zone_id: deliveryZoneId,
        address_dong: dong,
        address_ho: ho,
        address: `${zone.name} ${dong}동 ${ho}호`,
        entrance_password: entrancePasswordRaw ? encryptSensitive(entrancePasswordRaw) : null,
      })
      .eq("id", accountId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "저장 중 오류가 발생했어요" };
  }
}
