export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSensitive } from "@/lib/crypto";
import { getConfig } from "@/lib/settings";
import { geocodeAddress, optimizeRoute, estimateMinutes } from "@/lib/geocode";
import B2BDeliveryClient from "./B2BDeliveryClient";

function todayKST() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }); // YYYY-MM-DD
}

export default async function B2BDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const { date } = await searchParams;
  const targetDate = date || todayKST();

  const admin = createAdminClient();

  const { data: rawOrders } = await admin
    .from("b2b_order")
    .select(
      "id, status, total_amount, desired_delivery_date, account_id, account(business_name, phone, address, entrance_password, latitude, longitude), b2b_order_item(quantity, product(name))"
    )
    .eq("desired_delivery_date", targetDate)
    .in("status", ["발주요청", "배송중", "입금대기", "입금확인완료"]);

  const orders = (rawOrders ?? []).map((o: any) => ({
    ...o,
    account: o.account
      ? { ...o.account, entrance_password: decryptSensitive(o.account.entrance_password) || null }
      : null,
  }));

  // 좌표가 없는 거래처는 이번에 지오코딩해서 계정에 캐시해둠(매번 다시 호출 안 하도록)
  for (const o of orders) {
    if (o.account && (o.account.latitude == null || o.account.longitude == null) && o.account.address) {
      const geo = await geocodeAddress(o.account.address);
      if (geo) {
        o.account.latitude = geo.lat;
        o.account.longitude = geo.lng;
        await admin.from("account").update({ latitude: geo.lat, longitude: geo.lng }).eq("id", o.account_id);
      }
    }
  }

  const originAddress = await getConfig("b2b_origin_address");
  const origin = originAddress ? await geocodeAddress(originAddress) : null;

  let route: { orderId: string; distanceFromPrevKm: number; etaMin: number }[] = [];
  if (origin) {
    const geocoded = orders.filter(
      (o) => o.account?.latitude != null && o.account?.longitude != null
    );
    const optimized = optimizeRoute(
      origin,
      geocoded.map((o) => ({ id: o.id, lat: o.account!.latitude!, lng: o.account!.longitude! }))
    );
    route = optimized.map((r) => ({
      orderId: r.stop.id,
      distanceFromPrevKm: r.distanceFromPrevKm,
      etaMin: estimateMinutes(r.distanceFromPrevKm),
    }));
  }

  return (
    <div className="pb-24">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin/operations" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">B2B 배송리스트</h1>
      </header>

      <B2BDeliveryClient
        orders={orders as any}
        route={route}
        targetDate={targetDate}
        origin={origin}
        originAddress={originAddress}
      />
    </div>
  );
}
