"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PhotoUploadButton from "@/components/PhotoUploadButton";
import { markB2CDelivered } from "@/app/admin/actions";

type Campaign = { id: string; title: string | null };

function koDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  const wd = ["일", "월", "화", "수", "목", "금", "토"][new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
  return `${m}/${day}(${wd})`;
}
type Order = {
  id: string;
  account_id?: string;
  status: string;
  total_amount: number;
  created_at: string;
  delivery_photo_url: string | null;
  account: {
    nickname: string | null;
    phone: string | null;
    address: string | null;
    address_dong: string | null;
    address_ho: string | null;
    entrance_password: string | null;
  } | null;
  b2c_order_item: { quantity: number; product: { name: string } | null }[];
};

export default function DeliveryClient({
  dates,
  todayDate,
  selectedDate,
  campaigns,
  selectedCampaignId,
  orders,
}: {
  dates: string[];
  todayDate: string;
  selectedDate: string | null;
  campaigns: Campaign[];
  selectedCampaignId: string | null;
  orders: Order[];
}) {
  const router = useRouter();
  const [expandedPhotos, setExpandedPhotos] = useState<Record<string, boolean>>({});

  const deliverySummary = useMemo(() => {
    const map = new Map<string, number>();
    // 배송완료 건은 더이상 배송해야 할 수량에서 빼줌(완료돼도 목록엔 남겨두되 집계에서만 제외)
    for (const o of orders) {
      if (o.status === "배송완료") continue;
      for (const item of o.b2c_order_item ?? []) {
        const name = item.product?.name ?? "상품";
        map.set(name, (map.get(name) ?? 0) + item.quantity);
      }
    }
    return Array.from(map.entries());
  }, [orders]);

  // 같은 집(같은 계정)의 주문은 한 번에 배송하므로 한 카드로 묶음
  const groups = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      const key = o.account_id ?? o.id;
      map.set(key, [...(map.get(key) ?? []), o]);
    }
    return Array.from(map.values()).map((list) => {
      const pendingOrders = list.filter((o) => o.status !== "배송완료");
      const primary = pendingOrders[0] ?? list[0];
      const mergedItems = new Map<string, number>();
      for (const o of list) {
        for (const i of o.b2c_order_item ?? []) {
          const n = i.product?.name ?? "상품";
          mergedItems.set(n, (mergedItems.get(n) ?? 0) + i.quantity);
        }
      }
      return {
        primary,
        list,
        isDone: pendingOrders.length === 0,
        alsoIds: pendingOrders.slice(1).map((o) => o.id),
        itemsSummary: Array.from(mergedItems.entries())
          .map(([n, q]) => `${n} ${q}판`)
          .join(", "),
      };
    });
  }, [orders]);

  const remainingCount = groups.filter((g) => !g.isDone).length;
  const doneCount = groups.length - remainingCount;

  return (
    <div className="px-5">
      <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {dates.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => router.push(`/admin/delivery?date=${d}`)}
            className={`shrink-0 rounded-lg border px-3.5 py-2 text-xs ${
              selectedDate === d
                ? "border-primary bg-primary font-bold text-white"
                : "border-neutral-200 bg-white text-neutral-500"
            }`}
          >
            {koDate(d)}
            {d === todayDate && <span className="ml-1 opacity-70">오늘</span>}
          </button>
        ))}
      </div>

      <details className="mb-4 text-xs text-neutral-500">
        <summary className="cursor-pointer">이전 캠페인 배송 보기</summary>
        <select
          value={selectedCampaignId ?? ""}
          onChange={(e) => router.push(`/admin/delivery?campaign=${e.target.value}`)}
          className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        >
          <option value="" disabled>
            캠페인을 선택해주세요
          </option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title ?? "제목없음"}
            </option>
          ))}
        </select>
      </details>

      {!selectedDate && !selectedCampaignId ? (
        <p className="py-10 text-center text-sm text-neutral-400">
          위에서 배송일을 선택하면 배송 대상 목록이 보여요
        </p>
      ) : (
        <>
          {deliverySummary.length > 0 && (
            <div className="mb-4 rounded-lg bg-primary-bg p-3">
              <p className="mb-1.5 text-xs font-medium text-primary-dark">
                배송해야 할 수량 (배송완료 처리마다 자동으로 줄어들어요)
              </p>
              <div className="flex flex-wrap gap-2">
                {deliverySummary.map(([name, qty]) => (
                  <span
                    key={name}
                    className="rounded-full bg-white px-3 py-1 text-xs text-primary-dark"
                  >
                    {name} {qty}판
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="mb-2 text-xs text-neutral-500">
            동/호수 순 · 남은 배송 {remainingCount}건{doneCount > 0 && ` · 완료 ${doneCount}건`}
          </p>

          <div className="space-y-2">
            {groups.length === 0 && (
              <p className="py-10 text-center text-sm text-neutral-400">
                배송 대상 주문이 없어요
              </p>
            )}
            {groups.map((g) => {
              const o = g.primary;
              const itemsSummary = g.itemsSummary;
              const dongHo =
                o.account?.address_dong || o.account?.address_ho
                  ? `${o.account?.address_dong ?? ""}동 ${o.account?.address_ho ?? ""}호`
                  : null;
              const watermarkLines = [dongHo, itemsSummary].filter(Boolean) as string[];
              const isDone = g.isDone;
              return (
                <div
                  key={o.id}
                  className={`rounded-xl border bg-white p-3.5 ${
                    isDone ? "border-neutral-100 opacity-55" : "border-neutral-200"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {o.account?.address_dong}동 {o.account?.address_ho}호
                    </span>
                    <span className={`text-xs ${isDone ? "font-medium text-green-600" : "text-neutral-500"}`}>
                      {isDone ? "배송완료 ✓" : o.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {o.account?.nickname ?? "이름없음"}
                    {o.account?.phone ? ` · ${o.account.phone}` : ""}
                  </p>
                  {o.account?.address && (
                    <p className="mt-1 text-xs text-blue-700">📍 {o.account.address}</p>
                  )}
                  {o.account?.entrance_password && (
                    <p className="text-xs text-blue-700">🔑 공동현관 비밀번호 {o.account.entrance_password}</p>
                  )}
                  <p className="mt-0.5 text-xs text-neutral-400">{itemsSummary}</p>
                  {!isDone && (
                    <div className="mt-2">
                      <PhotoUploadButton
                        orderId={o.id}
                        label="배송완료 사진"
                        confirmAddress={o.account?.address}
                        confirmItemsSummary={itemsSummary}
                        watermarkLines={watermarkLines}
                        alsoOrderIds={g.alsoIds}
                        onSubmit={markB2CDelivered}
                      />
                    </div>
                  )}
                  {isDone && o.delivery_photo_url && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPhotos((prev) => ({ ...prev, [o.id]: !prev[o.id] }))
                        }
                        className="mt-2 text-xs text-primary underline"
                      >
                        {expandedPhotos[o.id] ? "사진 접기" : "배송완료 사진 보기"}
                      </button>
                      {expandedPhotos[o.id] && (
                        <img
                          src={o.delivery_photo_url}
                          alt="배송완료 사진"
                          className="mt-2 w-full rounded-lg object-cover"
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
