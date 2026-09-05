"use server";

import { supabase } from "@/lib/supabase";
import { getOrCreateDemoAccount } from "@/lib/demoAccount";

export async function updateZone(formData: FormData) {
  const accountId = await getOrCreateDemoAccount("b2c");
  const zoneId = formData.get("zone_id") as string;
  const { error } = await supabase
    .from("account")
    .update({ delivery_zone_id: zoneId })
    .eq("id", accountId);
  if (error) throw new Error(error.message);
  return { success: true as const };
}
