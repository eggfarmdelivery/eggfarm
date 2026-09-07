"use client";

import { useMemo, useState } from "react";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import OrderJourney from "@/components/OrderJourney";

type OrderItem = { quantity: number; product: { name: string } | null };
type Order = {
  id: string;
  order_type: string;
  status: string;
  total_amount: number;
  delivery_photo_url: string | null;
  created_at: string;
  b2c_order_item: OrderItem[];
};

const STATUS_GROUPS: { key: string; label: string; statuses: string[] }[] = [
  { key: "전체", label: "전체", statuses: [] },
  { key: "진행중", label: "진행중", statuses: ["입금대기", "입금확인완료", "배송준비", "배송위임", "배송중"] },
  { key: "완료", label: "완료", statuses: ["배송완료"] },
  { key: "기타", label: "취소/거절", statuses: ["취소", "승인거절"] },
];

export default function OrdersClient({ orders }: { orders: Order[] }) {
  const [activeGroup, setActiveGroup] = useState("전체");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const result: Record<string, number> = { 전체: orders.length };
    for (const group of STATUS_GROUPS.slice(1)) {
      result[group.key] = orders.filter((o) => group.statuses.includes(o.status)).length;
    }
    return result;
  }, [orders]);

  const filtered = useMemo(() => {
    if (activeGroup === "전체") return orders;
    const group = STATUS_GROUPS.find((g) => g.key === activeGroup);
    if (!group) return orders;
    return orders.filter((o) => group.statuses.includes(o.status));
  }, [orders, activeGroup]);

  return (
    <main className="px-5">
      <div className="mb-4 grid grid-cols-4 gap-2">
        {STATUS_GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => setActiveGroup(g.key)}
            className={`rounded-lg border py-2.5 text-center transition-colors ${
              activeGroup === g.key
                ? "border-primary bg-primary-bg"
                : "border-neutral-200 bg-white"
            }`}
          >
            <p
              className={`text-base font-medium ${
                activeGroup === g.key ? "text-primary" : "text-neutral-700"
              }`}
            >
              {counts[g.key] ?? 0}
            </p>
            <p className="text-[11px] text-neutral-500">{g.label}</p>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-neutral-400">해당 주문이 없어요</p>
      )}

      <div className="space-y-2">
        {filtered.map((o) => {
          const isOpen = expandedId === o.id;
          return (
            <div key={o.id} className="rounded-xl border border-neutral-200 overflow-hidden">
              <button
                onClick={() => setExpandedId(isOpen ? null : o.id)}
                className="flex w-full items-center justify-between p-4 text-left active:bg-neutral-50"
              >
                <div>
                  <p className="text-sm font-medium">{o.order_type}배송</p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {new Date(o.created_at).toLocaleDateString("ko-KR")} ·{" "}
                    {o.total_amount.toLocaleString()}원
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <OrderStatusBadge status={o.status} />
                  <span className="text-neutral-300">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-neutral-100 px-4 pb-4 pt-3">
                  <p className="mb-3 text-xs text-neutral-500">
                    {(o.b2c_order_item ?? [])
                      .map((i) => `${i.product?.name} ${i.quantity}판`)
                      .join(" · ")}
                  </p>
                  <OrderJourney status={o.status} />
                  {o.delivery_photo_url && (
                    <img
                      src={o.delivery_photo_url}
                      alt="배송완료 사진"
                      className="mt-3 w-full rounded-lg object-cover"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
