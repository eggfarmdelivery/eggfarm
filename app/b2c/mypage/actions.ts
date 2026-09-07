"use server";

import { createClient } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/getAccount";
import { encryptSensitive } from "@/lib/crypto";

export async function updateProfile(formData: FormData) {
  const accountId = await getAccountId("b2c");
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const baseAddress = String(formData.get("base_address") ?? "").trim();
  const dong = String(formData.get("address_dong") ?? "").trim();
  const ho = String(formData.get("address_ho") ?? "").trim();
  const entrancePasswordRaw = String(formData.get("entrance_password") ?? "").trim();

  if (!name || !phone || !baseAddress || !dong || !ho) {
    throw new Error("필수 항목을 모두 입력해주세요");
  }

  const { error } = await supabase
    .from("account")
    .update({
      name,
      phone,
      base_address: baseAddress,
      address_dong: dong,
      address_ho: ho,
      address: `${baseAddress} ${dong}동 ${ho}호`,
      entrance_password: entrancePasswordRaw ? encryptSensitive(entrancePasswordRaw) : null,
    })
    .eq("id", accountId);
  if (error) throw new Error(error.message);
  return { success: true as const };
}
