export const dynamic = "force-dynamic";

import { requireOwner } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import ZoneRequestMapClient from "./ZoneRequestMapClient";

export default async function ZoneRequestsPage() {
  await requireOwner();

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("zone_request")
    .select("id, road_address, lat, lng, geo_reason, geo_detail, created_at")
    .order("created_at", { ascending: false });

  const all = rows ?? [];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thisMonthCount = all.filter((r) => new Date(r.created_at) >= monthStart).length;

  // 같은 단지에서 온 요청을 좌표 기준으로 묶음(약 110m 단위로 라운딩) - 주소 표기가 조금씩 달라도 묶임
  const groups = new Map<string, { lat: number; lng: number; address: string; count: number }>();
  for (const r of all) {
    if (r.lat == null || r.lng == null) continue;
    const key = `${r.lat.toFixed(3)},${r.lng.toFixed(3)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, { lat: r.lat, lng: r.lng, address: r.road_address, count: 1 });
    }
  }
  const markers = Array.from(groups.values()).sort((a, b) => b.count - a.count);
  const ranking = markers.slice(0, 5).map((m, i) => ({ rank: i + 1, address: m.address, count: m.count }));
  const noCoord = all
    .filter((r) => r.lat == null || r.lng == null)
    .map((r) => ({ address: r.road_address, reason: r.geo_reason ?? "unknown", detail: r.geo_detail ?? null }));

  return (
    <div className="pb-24">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">단지 추가 요청 현황</h1>
        <p className="mt-1 text-xs text-neutral-500">
          비로그인 방문자가 남긴 배송 희망 지역이에요. 오픈 우선순위 판단용 지표예요.
        </p>
      </header>

      <ZoneRequestMapClient
        markers={markers}
        ranking={ranking}
        totalCount={all.length}
        thisMonthCount={thisMonthCount}
        noCoord={noCoord}
      />
    </div>
  );
}
