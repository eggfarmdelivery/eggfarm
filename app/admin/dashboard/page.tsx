export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";

const IN_PROGRESS_STATUSES = ["입금대기", "입금확인완료", "배송중", "배송위임", "환불대기"];

export default async function DashboardPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count: totalAccounts } = await admin
    .from("account")
    .select("id", { count: "exact", head: true })
    .eq("role", "b2c");

  const { count: newAccountsThisMonth } = await admin
    .from("account")
    .select("id", { count: "exact", head: true })
    .eq("role", "b2c")
    .gte("created_at", monthStart);

  const { count: totalOrders } = await admin
    .from("b2c_order")
    .select("id", { count: "exact", head: true });

  const { count: inProgressOrders } = await admin
    .from("b2c_order")
    .select("id", { count: "exact", head: true })
    .in("status", IN_PROGRESS_STATUSES);

  const { data: deliveredOrders } = await admin
    .from("b2c_order")
    .select("total_amount, created_at, campaign(title)")
    .eq("status", "배송완료");

  const totalRevenue = (deliveredOrders ?? []).reduce((s, o) => s + o.total_amount, 0);
  const revenueThisMonth = (deliveredOrders ?? [])
    .filter((o) => o.created_at >= monthStart)
    .reduce((s, o) => s + o.total_amount, 0);

  const byCampaign = new Map<string, { revenue: number; count: number }>();
  for (const o of deliveredOrders ?? []) {
    const title = (o.campaign as any)?.title ?? "제목없음";
    const cur = byCampaign.get(title) ?? { revenue: 0, count: 0 };
    cur.revenue += o.total_amount;
    cur.count += 1;
    byCampaign.set(title, cur);
  }
  const campaignRows = Array.from(byCampaign.entries()).sort((a, b) => b[1].revenue - a[1].revenue);

  return (
    <div className="pb-10">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">현황</h1>
      </header>

      <div className="px-5">
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">총 회원수</p>
            <p className="text-xl font-medium">{(totalAccounts ?? 0).toLocaleString()}명</p>
          </div>
          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">이번달 신규가입</p>
            <p className="text-xl font-medium">{(newAccountsThisMonth ?? 0).toLocaleString()}명</p>
          </div>
          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">전체 주문건수</p>
            <p className="text-xl font-medium">{(totalOrders ?? 0).toLocaleString()}건</p>
          </div>
          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">진행중 주문</p>
            <p className="text-xl font-medium">{(inProgressOrders ?? 0).toLocaleString()}건</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-primary-bg p-4">
          <p className="mb-1 text-xs text-primary-dark">누적 매출 (배송완료 기준)</p>
          <p className="text-2xl font-medium text-primary-dark">
            {totalRevenue.toLocaleString()}원
          </p>
          <p className="mt-1 text-xs text-primary-dark">
            이번달 {revenueThisMonth.toLocaleString()}원
          </p>
        </div>

        <p className="mb-2 text-sm font-medium">캠페인별 매출</p>
        {campaignRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">
            배송완료된 주문이 아직 없어요
          </p>
        ) : (
          <div className="space-y-2">
            {campaignRows.map(([title, { revenue, count }]) => (
              <div
                key={title}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{title}</p>
                  <p className="text-xs text-neutral-400">{count}건</p>
                </div>
                <p className="shrink-0 text-sm font-medium">{revenue.toLocaleString()}원</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
