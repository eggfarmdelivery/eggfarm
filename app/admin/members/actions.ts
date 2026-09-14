"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";
import { decryptSensitive } from "@/lib/crypto";

export type MemberSearchResult = {
  id: string;
  role: string;
  nickname: string | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  address_dong: string | null;
  address_ho: string | null;
  entrance_password: string | null;
  business_name: string | null;
  business_number: string | null;
  business_type: string | null;
  approval_status: string | null;
  zone_name: string | null;
  is_test: boolean;
  created_at: string;
};

export async function searchMembers(
  query: string
): Promise<MemberSearchResult[] | { error: string }> {
  try {
    await requireAdmin();
    const q = query.trim();
    if (!q) return [];
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("account")
      .select(
        "id, role, nickname, name, phone, address, address_dong, address_ho, entrance_password, business_name, business_number, business_type, approval_status, delivery_zone_id, is_test, created_at"
      )
      .or(`nickname.ilike.%${q}%,name.ilike.%${q}%,phone.ilike.%${q}%,business_name.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) throw new Error(error.message);

    const zoneIds = Array.from(new Set((data ?? []).map((a) => a.delivery_zone_id).filter(Boolean)));
    const zoneMap = new Map<string, string>();
    if (zoneIds.length > 0) {
      const { data: zones } = await admin.from("delivery_zone").select("id, name").in("id", zoneIds as string[]);
      for (const z of zones ?? []) zoneMap.set(z.id, z.name);
    }

    return (data ?? []).map((a) => ({
      id: a.id,
      role: a.role,
      nickname: a.nickname,
      name: a.name,
      phone: a.phone,
      address: a.address,
      address_dong: a.address_dong,
      address_ho: a.address_ho,
      entrance_password: decryptSensitive(a.entrance_password) || null,
      business_name: a.business_name,
      business_number: a.business_number,
      business_type: a.business_type,
      approval_status: a.approval_status,
      zone_name: a.delivery_zone_id ? zoneMap.get(a.delivery_zone_id) ?? null : null,
      is_test: a.is_test,
      created_at: a.created_at,
    }));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "검색 중 오류가 발생했어요" };
  }
}
