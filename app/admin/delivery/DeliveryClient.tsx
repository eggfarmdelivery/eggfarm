"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import PhotoUploadButton from "@/components/PhotoUploadButton";
import { markB2CDelivered } from "@/app/admin/actions";

type Campaign = { id: string; title: string | null };
type Order = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  account: {
    nickname: string | null;
    phone: string | null;
    address: string | null;
    address_dong: string | null;
    address_ho: string | null;
  } | null;
  b2c_order_item: { quantity: number; product: { name: string } | null }[];
};

export default function DeliveryClient({
  campaigns,
  selectedCampaignId,
  orders,
}: {
  campaigns: Campaign[];
  selectedCampaignId: string | null;
  orders: Order[];
}) {
  const router = useRouter();

  const deliverySummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      for (const item of o.b2c_order_item ?? []) {
        const name = item.product?.name ?? "상품";
        map.set(name, (map.get(name) ?? 0) + item.quantity);
      }
    }
    return Array.from(map.entries());
  }, [orders]);

  return (
    <div className="px-5">
      <select
        value={selectedCampaignId ?? ""}
        onChange={(e) => router.push(`/admin/delivery?campaign=${e.target.value}`)}
        className="mb-4 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
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

      {!selectedCampaignId ? (
        <p className="py-10 text-center text-sm text-neutral-400">
          위에서 캠페인을 선택하면 배송 대상 목록이 보여요
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
            동/호수 순 · 총 {orders.length}건
          </p>

          <div className="space-y-2">
            {orders.length === 0 && (
              <p className="py-10 text-center text-sm text-neutral-400">
                배송 대상 주문이 없어요
              </p>
            )}
            {orders.map((o) => {
              const itemsSummary = (o.b2c_order_item ?? [])
                .map((i) => `${i.product?.name ?? "상품"} ${i.quantity}판`)
                .join(", ");
              return (
                <div key={o.id} className="rounded-lg border border-neutral-200 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {o.account?.address_dong}동 {o.account?.address_ho}호
                    </span>
                    <span className="text-xs text-neutral-500">{o.status}</span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {o.account?.nickname ?? "이름없음"}
                    {o.account?.phone ? ` · ${o.account.phone}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">{itemsSummary}</p>
                  <div className="mt-2">
                    <PhotoUploadButton
                      orderId={o.id}
                      label="배송완료 사진"
                      confirmAddress={o.account?.address}
                      confirmItemsSummary={itemsSummary}
                      onSubmit={markB2CDelivered}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
