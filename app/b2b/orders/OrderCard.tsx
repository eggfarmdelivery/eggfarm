"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { cancelB2BOrder } from "./actions";

type Item = { quantity: number; original_quantity: number | null; adjusted: boolean; product: { name: string } | null };
type Order = {
  id: string;
  status: string;
  total_amount: number;
  delivery_photo_url: string | null;
  desired_delivery_date: string | null;
  created_at: string;
  b2b_order_item: Item[];
};

export default function OrderCard({ order: o }: { order: Order }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const hasAdjusted = (o.b2b_order_item ?? []).some((i) => i.adjusted);

  async function handleCancel() {
    if (!confirm("이 발주를 취소할까요?")) return;
    setBusy(true);
    setError(null);
    const result = await cancelB2BOrder(o.id);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{o.total_amount.toLocaleString()}원</span>
        <OrderStatusBadge status={o.status} />
      </div>
      <p className="text-xs text-neutral-500 mb-1">
        {(o.b2b_order_item ?? [])
          .map((i) =>
            i.adjusted && i.original_quantity != null
              ? `${i.product?.name} ${i.original_quantity}판 → ${i.quantity}판으로 조정됨`
              : `${i.product?.name} ${i.quantity}판`
          )
          .join(" · ")}
      </p>
      {hasAdjusted && (
        <p className="mb-1 text-xs text-orange-600">재고 사정 등으로 수량이 조정됐어요</p>
      )}
      {o.desired_delivery_date && (
        <p className="text-xs text-neutral-400">
          희망 배송일 {new Date(o.desired_delivery_date).toLocaleDateString("ko-KR")}
        </p>
      )}
      <p className="text-xs text-neutral-400">
        {new Date(o.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
      </p>
      {o.delivery_photo_url && (
        <img src={o.delivery_photo_url} alt="배송완료 사진" className="mt-3 rounded-lg w-full object-cover" />
      )}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      {o.status === "발주요청" && (
        <button
          onClick={handleCancel}
          disabled={busy}
          className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-500 disabled:opacity-50"
        >
          {busy ? "처리 중..." : "발주 취소"}
        </button>
      )}
    </div>
  );
}
