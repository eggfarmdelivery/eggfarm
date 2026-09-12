"use client";

import { useRouter } from "next/navigation";
import PhotoUploadButton from "@/components/PhotoUploadButton";
import { markB2BDelivered } from "../actions";

type Order = {
  id: string;
  status: string;
  total_amount: number;
  account: {
    business_name: string | null;
    phone: string | null;
    address: string | null;
    entrance_password: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  b2b_order_item: { quantity: number; product: { name: string } | null }[];
};

function buildNaverMapUrl(
  origin: { lat: number; lng: number },
  stops: { lat: number; lng: number; name: string }[]
) {
  const params = new URLSearchParams();
  params.set("slat", String(origin.lat));
  params.set("slng", String(origin.lng));
  params.set("sname", "출발지");
  // 마지막에 출발지로 복귀하는 왕복 경로로 구성. 경유지(via)는 최대 5곳까지 지원됨
  const vias = stops.slice(0, 5);
  vias.forEach((s, idx) => {
    const n = idx + 1;
    params.set(`v${n}lat`, String(s.lat));
    params.set(`v${n}lng`, String(s.lng));
    params.set(`v${n}name`, s.name);
  });
  params.set("dlat", String(origin.lat));
  params.set("dlng", String(origin.lng));
  params.set("dname", "출발지(복귀)");
  params.set("appname", "com.eggfarm.app");
  return `nmap://route/car?${params.toString()}`;
}

export default function B2BDeliveryClient({
  orders,
  route,
  targetDate,
  origin,
  originAddress,
}: {
  orders: Order[];
  route: { orderId: string; distanceFromPrevKm: number; etaMin: number }[];
  targetDate: string;
  origin: { lat: number; lng: number } | null;
  originAddress: string;
}) {
  const router = useRouter();
  const routeMap = new Map(route.map((r) => [r.orderId, r]));
  const ordered = [...orders].sort((a, b) => {
    const ia = route.findIndex((r) => r.orderId === a.id);
    const ib = route.findIndex((r) => r.orderId === b.id);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const remaining = ordered.filter((o) => !["입금대기", "입금확인완료"].includes(o.status));
  const totalEtaMin = route.reduce((s, r) => s + r.etaMin, 0);

  const naverUrl =
    origin && route.length > 0
      ? buildNaverMapUrl(
          origin,
          route
            .map((r) => ordered.find((o) => o.id === r.orderId))
            .filter((o): o is Order => !!o && o.account?.latitude != null)
            .map((o) => ({
              lat: o.account!.latitude!,
              lng: o.account!.longitude!,
              name: o.account?.business_name ?? "거래처",
            }))
        )
      : null;

  return (
    <div className="px-5">
      <div className="mb-3 flex items-center gap-2">
        <input
          type="date"
          defaultValue={targetDate}
          onChange={(e) => router.push(`/admin/b2b-delivery?date=${e.target.value}`)}
          className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm"
        />
        <span className="text-xs text-neutral-500">
          남은 배송 {remaining.length}건{orders.length > remaining.length && ` · 완료 ${orders.length - remaining.length}건`}
        </span>
      </div>

      {!originAddress && (
        <p className="mb-3 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
          환경설정에서 출발지 주소를 등록하면 방문순서 추천과 네이버지도 연결을 쓸 수 있어요
        </p>
      )}

      {naverUrl && (
        <div className="mb-3 rounded-lg bg-neutral-50 px-3 py-2.5">
          <p className="mb-2 text-xs text-neutral-500">
            방문순서 추천(직선거리 기준) · 대략 예상 이동시간 {totalEtaMin}분
          </p>
          <a
            href={naverUrl}
            className="flex items-center justify-center gap-2 rounded-md bg-[#03C75A] py-2.5 text-sm font-medium text-white"
          >
            네이버지도로 길찾기
          </a>
        </div>
      )}

      {orders.length === 0 && (
        <p className="py-10 text-center text-sm text-neutral-400">이 날짜에 배송할 발주가 없어요</p>
      )}

      <div className="space-y-2">
        {ordered.map((o, idx) => {
          const isDone = ["입금대기", "입금확인완료"].includes(o.status);
          const r = routeMap.get(o.id);
          const itemsSummary = (o.b2b_order_item ?? [])
            .map((i) => `${i.product?.name ?? "상품"} ${i.quantity}판`)
            .join(", ");
          return (
            <div
              key={o.id}
              className={`rounded-lg border p-3 ${
                isDone ? "border-neutral-100 bg-neutral-50 opacity-60" : "border-neutral-200"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {routeMap.has(o.id) && !isDone && `${idx + 1}. `}
                  {o.account?.business_name ?? "거래처"}
                </span>
                <span className={`text-xs ${isDone ? "font-medium text-green-600" : "text-neutral-500"}`}>
                  {isDone ? "배송완료 ✓" : o.status}
                </span>
              </div>
              {r && !isDone && (
                <p className="text-xs text-neutral-400">
                  이전 지점에서 약 {r.distanceFromPrevKm.toFixed(1)}km · 약 {r.etaMin}분
                </p>
              )}
              <p className="text-xs text-neutral-500">{o.account?.phone}</p>
              {o.account?.address && <p className="mt-1 text-xs text-blue-700">📍 {o.account.address}</p>}
              {o.account?.entrance_password && (
                <p className="text-xs text-blue-700">🔑 {o.account.entrance_password}</p>
              )}
              <p className="mt-0.5 text-xs text-neutral-400">{itemsSummary}</p>
              {!isDone && (
                <div className="mt-2">
                  <PhotoUploadButton
                    orderId={o.id}
                    label="배송완료 사진(입금요청 알림)"
                    confirmAddress={o.account?.address}
                    confirmItemsSummary={itemsSummary}
                    onSubmit={markB2BDelivered}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
