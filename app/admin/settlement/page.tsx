export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import SettlementClient from "./SettlementClient";

type DetailRow = {
  date: string;
  product: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  paymentMethod: string | null;
};

export default async function SettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdmin();
  const { month } = await searchParams;

  const now = new Date();
  const [y, m] = month ? month.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const monthEndStr = monthEnd.toISOString().slice(0, 10);
  const monthLabel = `${m}월분`;
  const monthValue = `${y}-${String(m).padStart(2, "0")}`;

  // 확정(입금확인완료) 건 - 정산 대상
  const { data: confirmedOrdersRaw } = await supabase
    .from("b2b_order")
    .select(
      "id, account_id, total_amount, payment_method, payment_confirmed_at, account(business_name, is_test), b2b_order_item(quantity, unit_price, subtotal, product(name))"
    )
    .eq("status", "입금확인완료")
    .gte("payment_confirmed_at", monthStartStr)
    .lt("payment_confirmed_at", monthEndStr);
  // 테스트계정 발주는 정산 통계에서 제외
  const confirmedOrders = (confirmedOrdersRaw ?? []).filter((o: any) => !o.account?.is_test);

  // 배송은 됐지만 아직 결제(계좌이체/현금) 확인이 안 된 건 - "결제대기"로 별도 표시
  const { data: unconfirmedOrdersRaw } = await supabase
    .from("b2b_order")
    .select("id, account_id, total_amount, account(business_name, is_test)")
    .eq("status", "입금대기")
    .gte("delivery_completed_at", monthStartStr)
    .lt("delivery_completed_at", monthEndStr);
  const unconfirmedOrders = (unconfirmedOrdersRaw ?? []).filter((o: any) => !o.account?.is_test);

  const { data: settlements } = await supabase
    .from("b2b_settlement")
    .select("account_id, status")
    .eq("settlement_month", monthStartStr);
  const settlementMap = new Map((settlements ?? []).map((s) => [s.account_id, s.status]));

  const grouped = new Map<
    string,
    {
      businessName: string;
      orderCount: number;
      totalAmount: number;
      pendingCount: number;
      pendingAmount: number;
      detail: DetailRow[];
    }
  >();

  for (const o of confirmedOrders ?? []) {
    const key = o.account_id;
    const existing = grouped.get(key) ?? {
      businessName: (o.account as any)?.business_name ?? "거래처",
      orderCount: 0,
      totalAmount: 0,
      pendingCount: 0,
      pendingAmount: 0,
      detail: [] as DetailRow[],
    };
    existing.orderCount += 1;
    existing.totalAmount += o.total_amount;
    for (const item of (o as any).b2b_order_item ?? []) {
      existing.detail.push({
        date: o.payment_confirmed_at ?? "",
        product: item.product?.name ?? "상품",
        unitPrice: item.unit_price,
        quantity: item.quantity,
        subtotal: item.subtotal,
        paymentMethod: o.payment_method,
      });
    }
    grouped.set(key, existing);
  }

  for (const o of unconfirmedOrders ?? []) {
    const key = o.account_id;
    const existing = grouped.get(key) ?? {
      businessName: (o.account as any)?.business_name ?? "거래처",
      orderCount: 0,
      totalAmount: 0,
      pendingCount: 0,
      pendingAmount: 0,
      detail: [] as DetailRow[],
    };
    existing.pendingCount += 1;
    existing.pendingAmount += o.total_amount;
    grouped.set(key, existing);
  }

  const rows = Array.from(grouped.entries()).map(([accountId, v]) => ({
    accountId,
    ...v,
    settlementStatus: (settlementMap.get(accountId) as "대기" | "이체완료") ?? "대기",
  }));

  return (
    <div className="pb-24">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin/records" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">B2B 정산</h1>
      </header>
      <SettlementClient
        rows={rows}
        monthLabel={monthLabel}
        settlementMonth={monthStartStr}
        monthValue={monthValue}
      />
    </div>
  );
}
