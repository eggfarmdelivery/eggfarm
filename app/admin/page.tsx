export const dynamic = "force-dynamic";

import { requireOwner } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardClient, { type DashOrder, type WaitingOrder } from "./DashboardClient";

// v41 현황 개편: 카드 대신 "주문 들어옴 / 입금확인 처리 / 배송해야 할 것" 3가지만 보여줌.
// 기간(오늘/3일/1주/1달) 계산은 관리자 폰의 현지 시각 기준으로 하려고 화면(클라이언트)에서 처리함.
// 그래서 여기서는 최근 31일치 주문의 시각/금액/상태만 넉넉히 가져와서 넘겨줌.

const CANCELLED = ["취소", "환불대기", "환불완료", "승인거절"];

function itemsSummary(items: any[] | null | undefined): string {
  return (items ?? [])
    .map((it) => `${it.product?.name ?? "상품"} ${it.quantity}판`)
    .join(" · ");
}

export default async function AdminHome() {
  await requireOwner();
  const admin = createAdminClient();

  const since = new Date(Date.now() - 31 * 86400000).toISOString();
  const recent = `created_at.gte.${since},payment_confirmed_at.gte.${since}`;

  const [
    b2cRecentRes,
    b2bRecentRes,
    b2cWaitingRes,
    b2bWaitingRes,
    b2cToShipRes,
    b2cShippingRes,
    b2bToShipRes,
    b2bShippingRes,
    refundRes,
    b2bRequestRes,
    b2bApprovalRes,
  ] = await Promise.all([
    admin
      .from("b2c_order")
      .select("status, total_amount, created_at, payment_confirmed_at, account(is_test)")
      .or(recent),
    admin
      .from("b2b_order")
      .select("status, total_amount, created_at, payment_confirmed_at, account(is_test)")
      .or(recent),
    admin
      .from("b2c_order")
      .select("id, total_amount, created_at, account(nickname, name, address_dong, address_ho, is_test), b2c_order_item(quantity, product(name))")
      .eq("status", "입금대기")
      .order("created_at", { ascending: true }),
    admin
      .from("b2b_order")
      .select("id, total_amount, created_at, delivery_completed_at, account(business_name, is_test), b2b_order_item(quantity, product(name))")
      .eq("status", "입금대기")
      .order("created_at", { ascending: true }),
    admin.from("b2c_order").select("id, account(is_test)").eq("status", "입금확인완료"),
    admin.from("b2c_order").select("id, account(is_test)").eq("status", "배송중"),
    admin.from("b2b_order").select("id, account(is_test)").eq("status", "주문확정"),
    admin.from("b2b_order").select("id, account(is_test)").eq("status", "배송중"),
    admin.from("b2c_order").select("id, account(is_test)").eq("status", "환불대기"),
    admin.from("b2b_order").select("id, account(is_test)").in("status", ["발주요청", "승인대기"]),
    admin
      .from("account")
      .select("id", { count: "exact", head: true })
      .eq("role", "b2b")
      .eq("approval_status", "pending")
      .eq("is_test", false),
  ]);

  // 테스트 계정 주문은 현황에서 제외
  const real = (rows: any[] | null | undefined) => (rows ?? []).filter((r) => !r.account?.is_test);

  const toDash = (rows: any[] | null | undefined): DashOrder[] =>
    real(rows).map((o) => ({
      createdAt: o.created_at,
      paidAt: o.payment_confirmed_at,
      amount: o.total_amount ?? 0,
      cancelled: CANCELLED.includes(o.status),
      stillWaiting: o.status === "입금대기" || o.status === "발주요청" || o.status === "승인대기",
    }));

  const b2cWaiting: WaitingOrder[] = real(b2cWaitingRes.data).map((o) => {
    const a = o.account ?? {};
    const dongHo = a.address_dong || a.address_ho ? `${a.address_dong ?? ""}동 ${a.address_ho ?? ""}호` : "";
    return {
      id: o.id,
      name: a.name || a.nickname || "이름없음",
      sub: [dongHo, itemsSummary(o.b2c_order_item)].filter(Boolean).join(" · "),
      amount: o.total_amount ?? 0,
      at: o.created_at,
      atLabel: "주문",
    };
  });

  const b2bWaiting: WaitingOrder[] = real(b2bWaitingRes.data).map((o) => ({
    id: o.id,
    name: o.account?.business_name ?? "거래처",
    sub: itemsSummary(o.b2b_order_item),
    amount: o.total_amount ?? 0,
    at: o.delivery_completed_at ?? o.created_at,
    atLabel: o.delivery_completed_at ? "배송완료" : "주문",
  }));

  return (
    <DashboardClient
      b2c={{
        orders: toDash(b2cRecentRes.data),
        waiting: b2cWaiting,
        toShip: real(b2cToShipRes.data).length,
        shipping: real(b2cShippingRes.data).length,
        extra: [{ label: "환불 대기", count: real(refundRes.data).length, href: "/admin/orders?status=환불대기" }],
      }}
      b2b={{
        orders: toDash(b2bRecentRes.data),
        waiting: b2bWaiting,
        toShip: real(b2bToShipRes.data).length,
        shipping: real(b2bShippingRes.data).length,
        extra: [
          { label: "새 발주 확인", count: real(b2bRequestRes.data).length, href: "/admin/b2b-orders" },
          { label: "거래처 승인 대기", count: b2bApprovalRes.count ?? 0, href: "/admin/b2b-accounts" },
        ],
      }}
    />
  );
}
