export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOpenCampaigns, getCampaignSold } from "@/lib/campaign";
import { isAdminKakaoConnected } from "@/lib/kakao";
import AdminDashboardCards, { type DashboardCard } from "./AdminDashboardCards";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function daysAgo(n: number) {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - n);
  return d;
}

export default async function AdminHome() {
  await requireAdmin();
  const admin = createAdminClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const weekStart = daysAgo(now.getDay() === 0 ? 6 : now.getDay() - 1); // 이번주 월요일 0시

  // ---------- 가입자 ----------
  const { count: totalAccounts } = await admin
    .from("account")
    .select("id", { count: "exact", head: true })
    .eq("role", "b2c")
    .eq("is_test", false);
  const { count: todayAccounts } = await admin
    .from("account")
    .select("id", { count: "exact", head: true })
    .eq("role", "b2c")
    .eq("is_test", false)
    .gte("created_at", startOfDay(now).toISOString());
  const { count: weekAccounts } = await admin
    .from("account")
    .select("id", { count: "exact", head: true })
    .eq("role", "b2c")
    .eq("is_test", false)
    .gte("created_at", weekStart.toISOString());
  const { count: monthAccounts } = await admin
    .from("account")
    .select("id", { count: "exact", head: true })
    .eq("role", "b2c")
    .eq("is_test", false)
    .gte("created_at", monthStart.toISOString());
  const { count: noZoneAccounts } = await admin
    .from("account")
    .select("id", { count: "exact", head: true })
    .eq("role", "b2c")
    .eq("is_test", false)
    .is("delivery_zone_id", null);

  // ---------- 주문 ----------
  const { count: weekOrders } = await admin
    .from("b2c_order")
    .select("id", { count: "exact", head: true })
    .gte("created_at", weekStart.toISOString());
  const { count: pendingPaymentOrders } = await admin
    .from("b2c_order")
    .select("id", { count: "exact", head: true })
    .eq("status", "입금대기");
  const orderStatusCounts: Record<string, number> = {};
  for (const status of ["입금대기", "입금확인완료", "배송중", "배송완료"]) {
    const { count } = await admin
      .from("b2c_order")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    orderStatusCounts[status] = count ?? 0;
  }

  // ---------- 매출 ----------
  const { data: deliveredThisMonth } = await admin
    .from("b2c_order")
    .select("total_amount")
    .eq("status", "배송완료")
    .gte("created_at", monthStart.toISOString());
  const { data: deliveredLastMonth } = await admin
    .from("b2c_order")
    .select("total_amount")
    .eq("status", "배송완료")
    .gte("created_at", lastMonthStart.toISOString())
    .lt("created_at", monthStart.toISOString());
  const revenueThisMonth = (deliveredThisMonth ?? []).reduce((s, o) => s + o.total_amount, 0);
  const revenueLastMonth = (deliveredLastMonth ?? []).reduce((s, o) => s + o.total_amount, 0);
  const avgOrderValue =
    (deliveredThisMonth?.length ?? 0) > 0
      ? Math.round(revenueThisMonth / (deliveredThisMonth?.length ?? 1))
      : 0;
  const revenueChangePct =
    revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : null;

  // ---------- 진행중 판매기간(캠페인) ----------
  const openCampaigns = await getOpenCampaigns();
  const campaignDetail: { label: string; value: string }[] = [];
  let totalStock = 0;
  let totalSold = 0;
  for (const { campaign, productLimits } of openCampaigns) {
    let campaignStock = 0;
    let campaignSold = 0;
    for (const limit of productLimits) {
      campaignStock += limit.stock_limit;
      campaignSold += await getCampaignSold(campaign.id, limit.product_id);
    }
    totalStock += campaignStock;
    totalSold += campaignSold;
    const pct = campaignStock > 0 ? Math.round((campaignSold / campaignStock) * 100) : 0;
    campaignDetail.push({
      label: campaign.title ?? "제목없음",
      value: `재고 ${pct}% 소진 · 마감 ${new Date(campaign.closes_at).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}`,
    });
  }
  const overallStockPct = totalStock > 0 ? Math.round((totalSold / totalStock) * 100) : 0;

  // ---------- 환불대기 ----------
  const { data: refundOrders } = await admin
    .from("b2c_order")
    .select("id, total_amount, created_at, account(nickname)")
    .eq("status", "환불대기")
    .order("created_at", { ascending: true });
  const refundCount = refundOrders?.length ?? 0;
  const maxRefundDays =
    refundCount > 0
      ? Math.floor((now.getTime() - new Date(refundOrders![0].created_at).getTime()) / 86400000)
      : 0;

  // ---------- 단지별 분포(이번주) ----------
  const { data: weekOrderZones } = await admin
    .from("b2c_order")
    .select("account(delivery_zone_id)")
    .gte("created_at", weekStart.toISOString());
  const { data: zones } = await admin.from("delivery_zone").select("id, name");
  const zoneNameMap = new Map((zones ?? []).map((z) => [z.id, z.name]));
  const zoneCounts = new Map<string, number>();
  for (const row of weekOrderZones ?? []) {
    const zoneId = (row.account as any)?.delivery_zone_id;
    if (!zoneId) continue;
    const name = zoneNameMap.get(zoneId) ?? "미지정";
    zoneCounts.set(name, (zoneCounts.get(name) ?? 0) + 1);
  }
  const zoneRows = Array.from(zoneCounts.entries()).sort((a, b) => b[1] - a[1]);
  const topZone = zoneRows[0];

  // ---------- 카카오 알림 연동 ----------
  const kakaoConnected = await isAdminKakaoConnected();

  // ---------- B2B ----------
  const { count: b2bApprovedCount } = await admin
    .from("account")
    .select("id", { count: "exact", head: true })
    .eq("role", "b2b")
    .eq("approval_status", "approved");
  const { count: b2bPendingCount } = await admin
    .from("account")
    .select("id", { count: "exact", head: true })
    .eq("role", "b2b")
    .eq("approval_status", "pending");
  const { count: b2bWeekOrders } = await admin
    .from("b2b_order")
    .select("id, account!inner(is_test)", { count: "exact", head: true })
    .eq("account.is_test", false)
    .gte("created_at", weekStart.toISOString());
  const { data: b2bConfirmedThisMonth } = await admin
    .from("b2b_order")
    .select("total_amount, account!inner(is_test)")
    .eq("status", "입금확인완료")
    .eq("account.is_test", false)
    .gte("payment_confirmed_at", monthStart.toISOString());
  const b2bRevenueThisMonth = (b2bConfirmedThisMonth ?? []).reduce((s, o) => s + o.total_amount, 0);
  const { data: b2bPendingPayment } = await admin
    .from("b2b_order")
    .select("total_amount, account!inner(is_test)")
    .eq("status", "입금대기")
    .eq("account.is_test", false);
  const b2bPendingPaymentAmount = (b2bPendingPayment ?? []).reduce((s, o) => s + o.total_amount, 0);

  const b2cCards: DashboardCard[] = [
    {
      key: "members",
      label: "가입자",
      icon: "users",
      value: `${(totalAccounts ?? 0).toLocaleString()}명`,
      sub: `+${weekAccounts ?? 0} 이번주`,
      moreLink: { label: "전체 명단 보기", href: "/admin/signups" },
      detail: [
        { label: "오늘 가입", value: `${todayAccounts ?? 0}명` },
        { label: "이번주 가입", value: `${weekAccounts ?? 0}명` },
        { label: "이번달 가입", value: `${monthAccounts ?? 0}명` },
        { label: "배송단지 미지정", value: `${noZoneAccounts ?? 0}명` },
      ],
    },
    {
      key: "orders",
      label: "이번주 주문",
      icon: "orders",
      value: `${weekOrders ?? 0}건`,
      sub: `입금대기 ${pendingPaymentOrders ?? 0}건`,
      danger: (pendingPaymentOrders ?? 0) > 0,
      detail: [
        { label: "입금대기", value: `${orderStatusCounts["입금대기"]}건` },
        { label: "입금확인완료", value: `${orderStatusCounts["입금확인완료"]}건` },
        { label: "배송중", value: `${orderStatusCounts["배송중"]}건` },
        { label: "배송완료", value: `${orderStatusCounts["배송완료"]}건` },
      ],
    },
    {
      key: "revenue",
      label: "이번달 매출",
      icon: "revenue",
      value: `${revenueThisMonth.toLocaleString()}원`,
      sub: revenueChangePct !== null ? `전월대비 ${revenueChangePct >= 0 ? "+" : ""}${revenueChangePct}%` : "배송완료 기준",
      detail: [
        { label: "이번달 매출", value: `${revenueThisMonth.toLocaleString()}원` },
        { label: "평균 객단가", value: `${avgOrderValue.toLocaleString()}원` },
        { label: "전월 매출", value: `${revenueLastMonth.toLocaleString()}원` },
        {
          label: "전월대비",
          value: revenueChangePct !== null ? `${revenueChangePct >= 0 ? "+" : ""}${revenueChangePct}%` : "-",
        },
      ],
    },
    {
      key: "campaign",
      label: "진행중 판매기간",
      icon: "campaign",
      value: `${openCampaigns.length}개`,
      sub: openCampaigns.length > 0 ? `재고 ${overallStockPct}% 소진` : "진행중인 판매기간 없음",
      detail: campaignDetail.length > 0 ? campaignDetail : [{ label: "안내", value: "진행중인 판매기간이 없어요" }],
    },
    {
      key: "refund",
      label: "환불대기",
      icon: "refund",
      value: `${refundCount}건`,
      sub: refundCount > 0 ? `최대 ${maxRefundDays}일 경과` : "없음",
      danger: refundCount > 0,
      detail:
        (refundOrders ?? []).length > 0
          ? refundOrders!.slice(0, 5).map((o) => ({
              label: (o.account as any)?.nickname ?? "이름없음",
              value: `${o.total_amount.toLocaleString()}원 · ${Math.floor(
                (now.getTime() - new Date(o.created_at).getTime()) / 86400000
              )}일 경과`,
            }))
          : [{ label: "안내", value: "환불대기 건이 없어요" }],
    },
    {
      key: "zones",
      label: "단지별 분포",
      icon: "zones",
      value: topZone ? `${topZone[0]} 1위` : "데이터 없음",
      sub: topZone ? `이번주 ${topZone[1]}건` : "이번주 주문 없음",
      detail:
        zoneRows.length > 0
          ? zoneRows.slice(0, 5).map(([name, count]) => ({ label: name, value: `${count}건` }))
          : [{ label: "안내", value: "이번주 주문이 없어요" }],
    },
  ];

  const b2bCards: DashboardCard[] = [
    {
      key: "b2bAccounts",
      label: "거래처",
      icon: "users",
      value: `${b2bApprovedCount ?? 0}곳`,
      sub: (b2bPendingCount ?? 0) > 0 ? `승인대기 ${b2bPendingCount}곳` : "승인대기 없음",
      danger: (b2bPendingCount ?? 0) > 0,
      detail: [
        { label: "승인된 거래처", value: `${b2bApprovedCount ?? 0}곳` },
        { label: "승인대기", value: `${b2bPendingCount ?? 0}곳` },
      ],
      moreLink: { label: "거래처 관리로 이동", href: "/admin/b2b-accounts" },
    },
    {
      key: "b2bOrders",
      label: "이번주 발주",
      icon: "orders",
      value: `${b2bWeekOrders ?? 0}건`,
      detail: [{ label: "이번주 발주", value: `${b2bWeekOrders ?? 0}건` }],
    },
    {
      key: "b2bRevenue",
      label: "이번달 B2B매출",
      icon: "revenue",
      value: `${b2bRevenueThisMonth.toLocaleString()}원`,
      sub: "입금확인완료 기준",
      detail: [{ label: "이번달 확정매출", value: `${b2bRevenueThisMonth.toLocaleString()}원` }],
      moreLink: { label: "정산 상세보기", href: "/admin/settlement" },
    },
    {
      key: "b2bPending",
      label: "결제대기",
      icon: "refund",
      value: `${(b2bPendingPayment ?? []).length}건`,
      sub: (b2bPendingPayment ?? []).length > 0 ? `${b2bPendingPaymentAmount.toLocaleString()}원` : "없음",
      danger: (b2bPendingPayment ?? []).length > 0,
      detail: [
        { label: "결제대기 건수", value: `${(b2bPendingPayment ?? []).length}건` },
        { label: "결제대기 금액", value: `${b2bPendingPaymentAmount.toLocaleString()}원` },
      ],
    },
  ];

  const commonCards: DashboardCard[] = [
    {
      key: "kakao",
      label: "카카오 알림",
      icon: "kakao",
      value: kakaoConnected ? "연동됨" : "연동 안 됨",
      sub: kakaoConnected ? "새 주문 알림 발송중" : "환경설정에서 연동해주세요",
      danger: !kakaoConnected,
      detail: [
        { label: "연동 상태", value: kakaoConnected ? "정상" : "미연동" },
        { label: "ADMIN_KAKAO_ID", value: process.env.ADMIN_KAKAO_ID ? "등록됨" : "미등록" },
      ],
    },
    {
      key: "delivery",
      label: "배송원 위임현황",
      icon: "delivery",
      value: "추후연동",
      muted: true,
      detail: [{ label: "안내", value: "위임배송 시스템 구현 후 연동 예정이에요" }],
    },
  ];

  return (
    <div className="pb-24">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">현황</h1>
      </header>

      <div className="px-5">
        <p className="mb-1.5 text-xs font-medium text-neutral-400">B2C</p>
        <AdminDashboardCards cards={b2cCards} />

        <p className="mb-1.5 mt-5 text-xs font-medium text-neutral-400">B2B</p>
        <AdminDashboardCards cards={b2bCards} />

        <p className="mb-1.5 mt-5 text-xs font-medium text-neutral-400">공통</p>
        <AdminDashboardCards cards={commonCards} />
      </div>
    </div>
  );
}
