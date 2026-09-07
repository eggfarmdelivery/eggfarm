"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import OrderJourney from "@/components/OrderJourney";
import QuantityStepper from "@/components/QuantityStepper";
import { updateOrderQuantities } from "./actions";

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  product_id: string;
  product: { name: string } | null;
};
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
  {
    key: "진행중",
    label: "진행중",
    statuses: ["입금대기", "입금확인완료", "배송준비", "배송위임", "배송중"],
  },
  { key: "완료", label: "완료", statuses: ["배송완료"] },
  { key: "기타", label: "취소/거절", statuses: ["취소", "승인거절"] },
];

const PERIOD_OPTIONS = [
  { key: "1m", label: "최근 1개월", months: 1 },
  { key: "3m", label: "최근 3개월", months: 3 },
  { key: "6m", label: "최근 6개월", months: 6 },
  { key: "1y", label: "최근 1년", months: 12 },
  { key: "custom", label: "직접 조회", months: null },
];

function monthsAgo(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

function OrderDetail({ order }: { order: Order }) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>(
    Object.fromEntries((order.b2c_order_item ?? []).map((i) => [i.id, i.quantity]))
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const canEdit = order.status === "입금대기";
  const newTotal = (order.b2c_order_item ?? []).reduce(
    (sum, i) => sum + (qty[i.id] ?? i.quantity) * i.unit_price,
    0
  );

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      const items = (order.b2c_order_item ?? []).map((i) => ({
        itemId: i.id,
        productId: i.product_id,
        unitPrice: i.unit_price,
        oldQty: i.quantity,
        newQty: qty[i.id] ?? i.quantity,
      }));
      const result = await updateOrderQuantities(order.id, items);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("수정 중 알 수 없는 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border-t border-neutral-100 px-4 pb-4 pt-3">
      {!editing ? (
        <>
          <div className="mb-3 flex items-start justify-between">
            <p className="text-xs text-neutral-500">
              {(order.b2c_order_item ?? [])
                .map((i) => `${i.product?.name} ${i.quantity}판`)
                .join(" · ")}
            </p>
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                className="shrink-0 text-xs text-primary underline"
              >
                수량 수정
              </button>
            )}
          </div>
          <OrderJourney status={order.status} />
          {order.delivery_photo_url && (
            <img
              src={order.delivery_photo_url}
              alt="배송완료 사진"
              className="mt-3 w-full rounded-lg object-cover"
            />
          )}
        </>
      ) : (
        <div>
          <div className="mb-3 space-y-2">
            {(order.b2c_order_item ?? []).map((i) => (
              <div key={i.id} className="flex items-center justify-between">
                <span className="text-sm">{i.product?.name}</span>
                <QuantityStepper
                  name={`qty_${i.id}`}
                  value={qty[i.id] ?? i.quantity}
                  onChange={(v) => setQty((prev) => ({ ...prev, [i.id]: v }))}
                  min={1}
                />
              </div>
            ))}
          </div>
          <div className="mb-3 flex items-baseline justify-between border-t border-neutral-100 pt-2">
            <span className="text-xs text-neutral-500">변경 후 금액</span>
            <span className="text-sm font-medium">{newTotal.toLocaleString()}원</span>
          </div>
          {error && (
            <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              disabled={pending}
              className="flex-1 rounded-lg border border-neutral-300 py-2 text-xs"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={pending}
              className="flex-1 rounded-lg bg-primary py-2 text-xs font-medium text-white disabled:opacity-60"
            >
              {pending ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersClient({ orders }: { orders: Order[] }) {
  const [activeGroup, setActiveGroup] = useState("전체");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [period, setPeriod] = useState("1m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const periodFiltered = useMemo(() => {
    if (period === "custom") {
      if (!customFrom && !customTo) return orders;
      const from = customFrom ? new Date(customFrom) : new Date(0);
      const to = customTo ? new Date(customTo + "T23:59:59") : new Date();
      return orders.filter((o) => {
        const d = new Date(o.created_at);
        return d >= from && d <= to;
      });
    }
    const opt = PERIOD_OPTIONS.find((p) => p.key === period);
    if (!opt || !opt.months) return orders;
    const from = monthsAgo(opt.months);
    return orders.filter((o) => new Date(o.created_at) >= from);
  }, [orders, period, customFrom, customTo]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { 전체: periodFiltered.length };
    for (const group of STATUS_GROUPS.slice(1)) {
      result[group.key] = periodFiltered.filter((o) =>
        group.statuses.includes(o.status)
      ).length;
    }
    return result;
  }, [periodFiltered]);

  const filtered = useMemo(() => {
    if (activeGroup === "전체") return periodFiltered;
    const group = STATUS_GROUPS.find((g) => g.key === activeGroup);
    if (!group) return periodFiltered;
    return periodFiltered.filter((o) => group.statuses.includes(o.status));
  }, [periodFiltered, activeGroup]);

  const currentPeriodLabel =
    PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? "기간";

  return (
    <main className="px-5">
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setPeriodOpen((v) => !v)}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600"
        >
          {currentPeriodLabel} ▾
        </button>
      </div>

      {periodOpen && (
        <div className="mb-4 rounded-lg border border-neutral-200 p-3">
          <div className="grid grid-cols-2 gap-2 mb-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  setPeriod(opt.key);
                  if (opt.key !== "custom") setPeriodOpen(false);
                }}
                className={`rounded-md border py-2 text-xs ${
                  period === opt.key
                    ? "border-primary bg-primary-bg text-primary"
                    : "border-neutral-200 text-neutral-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-xs"
              />
              <span className="text-xs text-neutral-400">~</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-xs"
              />
              <button
                onClick={() => setPeriodOpen(false)}
                className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs text-white"
              >
                조회
              </button>
            </div>
          )}
        </div>
      )}

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
                <OrderDetail order={o} />
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
