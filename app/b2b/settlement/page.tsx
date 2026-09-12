export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { getApprovedB2BAccountId } from "@/lib/getAccount";
import SettlementView from "./SettlementView";

export default async function B2BSettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const accountId = await getApprovedB2BAccountId();
  const { month } = await searchParams;

  const now = new Date();
  const [y, m] = month ? month.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const monthEndStr = monthEnd.toISOString().slice(0, 10);
  const monthLabel = `${m}월분`;
  const monthValue = `${y}-${String(m).padStart(2, "0")}`;

  const { data: confirmedOrders } = await supabase
    .from("b2b_order")
    .select("id, total_amount, payment_method, payment_confirmed_at, b2b_order_item(quantity, unit_price, subtotal, product(name))")
    .eq("account_id", accountId)
    .eq("status", "입금확인완료")
    .gte("payment_confirmed_at", monthStartStr)
    .lt("payment_confirmed_at", monthEndStr);

  const { data: unconfirmedOrders } = await supabase
    .from("b2b_order")
    .select("id, total_amount")
    .eq("account_id", accountId)
    .eq("status", "입금대기")
    .gte("delivery_completed_at", monthStartStr)
    .lt("delivery_completed_at", monthEndStr);

  const detail = (confirmedOrders ?? []).flatMap((o) =>
    (o.b2b_order_item ?? []).map((item: any) => ({
      date: o.payment_confirmed_at ?? "",
      product: item.product?.name ?? "상품",
      unitPrice: item.unit_price,
      quantity: item.quantity,
      subtotal: item.subtotal,
      paymentMethod: o.payment_method,
    }))
  );

  const totalAmount = (confirmedOrders ?? []).reduce((s, o) => s + o.total_amount, 0);
  const pendingAmount = (unconfirmedOrders ?? []).reduce((s, o) => s + o.total_amount, 0);
  const pendingCount = unconfirmedOrders?.length ?? 0;

  return (
    <div className="pb-10">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">납품내역</h1>
      </header>
      <SettlementView
        detail={detail}
        totalAmount={totalAmount}
        pendingAmount={pendingAmount}
        pendingCount={pendingCount}
        monthLabel={monthLabel}
        monthValue={monthValue}
      />
    </div>
  );
}
