"use server";

import { createClient } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/getAccount";

export async function updateZone(formData: FormData) {
  const accountId = await getAccountId("b2c");
  const zoneId = formData.get("zone_id") as string;
  const supabase = await createClient();
  const { error } = await supabase
    .from("account")
    .update({ delivery_zone_id: zoneId })
    .eq("id", accountId);
  if (error) throw new Error(error.message);
  return { success: true as const };
}
