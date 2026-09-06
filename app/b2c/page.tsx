export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import BottomNav from "@/components/BottomNav";

async function getCreditBalance(accountId: string) {
  const { data, error } = await supabase
    .from("credit_ledger")
    .select("delta")
    .eq("account_id", accountId);
  if (error || !data) return 0;
  return data.reduce((sum, row) => sum + row.delta, 0);
}

async function getRecentOrders(accountId: string) {
  const { data, error } = await supabase
    .from("b2c_order")
    .select("id, order_type, status, total_amount, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(3);
  if (error || !data) return [];
  return data;
}

export default async function B2CHome() {
  const accountId = await getAccountId("b2c");
  const credit = await getCreditBalance(accountId);
  const orders = await getRecentOrders(accountId);

  return (
    <div className="pb-20">
      <header className="flex items-center justify-between px-5 py-4">
        <img src="/logo.png" alt="에그팜" className="h-7 w-auto" />
        <button aria-label="알림">🔔</button>
      </header>

      <main className="px-5">
        <section className="rounded-xl bg-primary-bg p-4 mb-4">
          <p className="text-xs text-primary-dark mb-1">정기배송 잔여 크레딧</p>
          <p className="text-2xl font-medium text-primary-dark">
            {credit.toLocaleString()}원
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3 mb-6">
          <Link
            href="/b2c/regular"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 py-4"
          >
            <span className="text-2xl">🥚</span>
            <span className="text-sm">정기배송 신청</span>
          </Link>
          <Link
            href="/b2c/order"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 py-4"
          >
            <span className="text-2xl">🛒</span>
            <span className="text-sm">일반배송 주문</span>
          </Link>
        </section>

        <section>
          <p className="text-sm text-neutral-500 mb-2">최근 주문</p>
          <div className="border-t border-neutral-200">
            {orders.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-400">
                아직 주문 내역이 없어요
              </p>
            ) : (
              orders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between border-b border-neutral-200 py-3"
                >
                  <div>
                    <p className="text-sm">{o.order_type}배송</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {new Date(o.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <BottomNav active="/b2c" />
    </div>
  );
}
