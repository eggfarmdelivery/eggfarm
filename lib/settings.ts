import { supabase } from "@/lib/supabase";

export async function getConfigs(keys: string[]): Promise<Record<string, string>> {
  const { data } = await supabase.from("system_config").select("key, value").in("key", keys);
  const result: Record<string, string> = {};
  for (const key of keys) result[key] = "";
  for (const row of data ?? []) result[row.key] = row.value;
  return result;
}

export async function getConfig(key: string): Promise<string> {
  const result = await getConfigs([key]);
  return result[key] ?? "";
}
