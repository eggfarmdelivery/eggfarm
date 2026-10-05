export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requireOwner } from "@/lib/adminAuth";
import { getSchedule } from "@/lib/schedule";
import StockClient from "./StockClient";

export default async function StockPage() {
  await requireOwner();
  const schedule = await getSchedule();

  const { data: products } = await supabase
    .from("product")
    .select("id, name, base_price, photo_url, stock_qty, is_active")
    .order("created_at", { ascending: true });

  const { data: logs } = await supabase
    .from("stock_log")
    .select("id, product_id, delta, qty_after, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  const nameMap = new Map((products ?? []).map((p) => [p.id, p.name]));

  return (
    <div className="pb-24">
      <header className="flex items-center gap-2 bg-white px-5 py-4">
        <Link href="/admin/operations" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-bold">상품·재고 관리</h1>
      </header>
      <StockClient
        products={(products ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          base_price: p.base_price,
          photo_url: p.photo_url,
          stock: p.stock_qty ?? 0,
          is_active: p.is_active !== false,
        }))}
        threshold={schedule.lowThreshold}
        perPersonLimit={schedule.perPersonLimit}
        logs={(logs ?? []).map((l) => ({
          id: l.id,
          name: nameMap.get(l.product_id) ?? "상품",
          delta: l.delta,
          qtyAfter: l.qty_after,
          reason: l.reason,
          createdAt: l.created_at,
        }))}
      />
    </div>
  );
}
