export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import ZonesClient from "./ZonesClient";

export default async function ZonesPage() {
  await requireAdmin();

  const { data: zones } = await supabase
    .from("delivery_zone")
    .select("id, name, address, is_active, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="pb-24">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin/operations" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">배송가능 단지 관리</h1>
      </header>
      <ZonesClient zones={zones ?? []} />
    </div>
  );
}
