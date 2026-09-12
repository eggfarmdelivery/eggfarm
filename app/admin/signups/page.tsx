export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { maskPhone } from "@/lib/mask";
import SignupsClient from "./SignupsClient";

function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export default async function SignupsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdmin();
  const { range } = await searchParams;
  const period = range === "month" ? "month" : range === "all" ? "all" : "week";

  const admin = createAdminClient();

  let query = admin
    .from("account")
    .select("id, nickname, phone, created_at, delivery_zone_id, is_test")
    .eq("role", "b2c")
    .eq("is_test", false)
    .order("created_at", { ascending: false });

  if (period === "week") query = query.gte("created_at", daysAgo(6).toISOString());
  if (period === "month") query = query.gte("created_at", daysAgo(29).toISOString());

  const { data: accounts } = await query;

  const { data: zones } = await admin.from("delivery_zone").select("id, name");
  const zoneMap = new Map((zones ?? []).map((z) => [z.id, z.name]));

  const rows = (accounts ?? []).map((a) => ({
    id: a.id,
    nickname: a.nickname,
    phone: a.phone ? maskPhone(a.phone) : null,
    zoneName: a.delivery_zone_id ? zoneMap.get(a.delivery_zone_id) ?? "단지 미지정" : "단지 미지정",
    createdAt: a.created_at,
  }));

  return (
    <div className="pb-24">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">신규 가입자</h1>
      </header>
      <SignupsClient rows={rows} period={period} />
    </div>
  );
}
