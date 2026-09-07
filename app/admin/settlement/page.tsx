export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import SettlementClient from "./SettlementClient";

export default async function SettlementPage() {
  await requireAdmin();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const monthLabel = `${now.getMonth() + 1}월분`;

  const { data: orders } = await supabase
    .from("b2b_order")
    .select("account_id, total_amount, account(business_name)")
    .eq("status", "입금확인완료")
    .gte("payment_confirmed_at", monthStartStr);

  const { data: settlements } = await supabase
    .from("b2b_settlement")
    .select("account_id, status")
    .eq("settlement_month", monthStartStr);
  const settlementMap = new Map(
    (settlements ?? []).map((s) => [s.account_id, s.status])
  );

  const grouped = new Map<
    string,
    { businessName: string; orderCount: number; totalAmount: number }
  >();
  for (const o of orders ?? []) {
    const key = o.account_id;
    const existing = grouped.get(key) ?? {
      businessName: (o.account as any)?.business_name ?? "거래처",
      orderCount: 0,
      totalAmount: 0,
    };
    existing.orderCount += 1;
    existing.totalAmount += o.total_amount;
    grouped.set(key, existing);
  }

  const rows = Array.from(grouped.entries()).map(([accountId, v]) => ({
    accountId,
    ...v,
    settlementStatus: (settlementMap.get(accountId) as "대기" | "이체완료") ?? "대기",
  }));

  return (
    <div className="pb-10">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">B2B 정산</h1>
      </header>
      <SettlementClient
        rows={rows}
        monthLabel={monthLabel}
        settlementMonth={monthStartStr}
      />
    </div>
  );
}
