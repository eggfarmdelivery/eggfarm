export const dynamic = "force-dynamic";

import { requireOwner } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSchedule } from "@/lib/schedule";
import OperationsClient from "./OperationsClient";

// v41 운영 개편: B2C/B2B 탭 + 매일 쓰는 메뉴(주문관리·배송 리스트)는 크게, 나머지는 목록으로.
// 큰 버튼에는 지금 처리할 건수를 같이 보여줌.
export default async function OperationsPage() {
  await requireOwner();
  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [b2cRes, b2bRes, stockRes, zoneReqRes, schedule] = await Promise.all([
    admin
      .from("b2c_order")
      .select("status, account(is_test)")
      .in("status", ["입금대기", "입금확인완료", "배송중"]),
    admin
      .from("b2b_order")
      .select("status, account(is_test)")
      .in("status", ["승인대기", "발주요청", "주문확정", "배송중", "입금대기"]),
    admin.from("product").select("stock_qty").eq("is_active", true),
    admin.from("zone_request").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    getSchedule(),
  ]);

  const count = (rows: any[] | null | undefined, statuses: string[]) =>
    (rows ?? []).filter((r) => !r.account?.is_test && statuses.includes(r.status)).length;

  const lowStock = (stockRes.data ?? []).filter((p) => (p.stock_qty ?? 0) <= schedule.lowThreshold).length;

  return (
    <OperationsClient
      b2c={{
        waiting: count(b2cRes.data, ["입금대기"]),
        beforeShip: count(b2cRes.data, ["입금확인완료"]),
        toDeliver: count(b2cRes.data, ["입금확인완료", "배송중"]),
        lowStock,
        zoneRequests: zoneReqRes.count ?? 0,
      }}
      b2b={{
        newOrders: count(b2bRes.data, ["승인대기", "발주요청"]),
        waiting: count(b2bRes.data, ["입금대기"]),
        toDeliver: count(b2bRes.data, ["주문확정", "배송중"]),
      }}
    />
  );
}
