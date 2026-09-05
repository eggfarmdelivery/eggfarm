export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import ConsoleClient from "./ConsoleClient";

export default async function AdminConsole() {
  await requireAdmin();

  const { data: b2cOrders } = await supabase
    .from("b2c_order")
    .select("id, order_type, status, is_overflow, total_amount, created_at")
    .not("status", "in", "(배송완료,취소,승인거절)")
    .order("created_at", { ascending: false });

  const { data: b2bOrders } = await supabase
    .from("b2b_order")
    .select("id, status, total_amount, created_at, account(business_name)")
    .not("status", "in", "(입금확인완료,취소)")
    .order("created_at", { ascending: false });

  return (
    <div className="pb-10">
      <header className="flex items-center justify-between px-5 py-4">
        <h1 className="text-base font-medium">관리자 콘솔</h1>
        <nav className="flex gap-3 text-xs text-neutral-500">
          <Link href="/admin/limits">재고/한도</Link>
          <Link href="/admin/settlement">정산</Link>
          <Link href="/admin/quotes">견적문의</Link>
        </nav>
      </header>

      <ConsoleClient
        b2cOrders={(b2cOrders as any) ?? []}
        b2bOrders={(b2bOrders as any) ?? []}
      />
    </div>
  );
}
