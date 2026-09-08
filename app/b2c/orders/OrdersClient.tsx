"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import OrderJourney from "@/components/OrderJourney";
import QuantityStepper from "@/components/QuantityStepper";
import { updateOrderQuantities, cancelOrder } from "./actions";

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  product_id: string;
  product: { name: string; photo_url: string | null } | null;
};
type Order = {
  id: string;
  order_type: string;
  status: string;
  total_amount: number;
  delivery_photo_url: string | null;
  payment_confirmed_at: string | null;
  created_at: string;
  campaign: { delivery_date: string | null } | null;
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
  { key: "기타", label: "취소/환불", statuses: ["취소", "승인거절", "환불대기", "환불완료"] },
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
  const [cancelling, setCancelling] = useState(false);
  const [refundMethod, setRefundMethod] = useState<"credit" | "bank" | null>("credit");
  const [qty, setQty] = useState<Record<string, number>>(
    Object.fromEntries((order.b2c_order_item ?? []).map((i) => [i.id, i.quantity]))
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const canEdit = order.status === "입금대기";
  const canCancelFree = order.status === "입금대기";
  const canCancelWithRefund = ["입금확인완료", "배송준비"].includes(order.status);
  const canCancel = canCancelFree || canCancelWithRefund;
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

  async function handleCancel() {
    if (canCancelWithRefund && !refundMethod) {
      setError("환불 방법을 선택해주세요");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await cancelOrder(order.id, refundMethod ?? undefined);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCancelling(false);
      router.refresh();
    } catch {
      setError("취소 처리 중 알 수 없는 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  if (cancelling) {
    return (
      <div className="border-t border-neutral-100 px-4 pb-4 pt-3">
        <p className="mb-3 text-sm font-medium">정말 취소하시겠어요?</p>
        {canCancelWithRefund && (
          <div className="mb-3 space-y-2 rounded-xl bg-neutral-50 p-3">
            <p className="whitespace-nowrap text-xs font-medium text-neutral-600">환불 방법을 선택해주세요</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRefundMethod("credit")}
                className={`rounded-lg border py-2.5 text-xs ${
                  refundMethod === "credit"
                    ? "border-primary bg-primary text-white"
                    : "border-neutral-200 bg-white text-neutral-600"
                }`}
              >
                적립금(크레딧)으로 받기
              </button>
              <button
                onClick={() => setRefundMethod("bank")}
                className={`rounded-lg border py-2.5 text-xs ${
                  refundMethod === "bank"
                    ? "border-primary bg-primary text-white"
                    : "border-neutral-200 bg-white text-neutral-600"
                }`}
              >
                계좌로 환불받기
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCancelling(false);
              setError(null);
            }}
            disabled={pending}
            className="flex-1 rounded-lg border border-neutral-300 py-2 text-xs"
          >
            그만두기
          </button>
          <button
            onClick={handleCancel}
            disabled={pending}
            className="flex-1 rounded-lg bg-red-500 py-2 text-xs font-medium text-white disabled:opacity-60"
          >
            {pending ? "처리 중..." : "취소 확정"}
          </button>
        </div>
      </div>
    );
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
            <div className="flex shrink-0 gap-2">
              {canEdit && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-primary underline"
                >
                  수량 수정
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => setCancelling(true)}
                  className="text-xs text-neutral-400 underline"
                >
                  주문취소
                </button>
              )}
            </div>
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
  const router = useRouter();
  const [activeGroup, setActiveGroup] = useState("전체");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [period, setPeriod] = useState("1m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // 30초마다 자동 새로고침
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(interval);
  }, [router]);

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

      {periodFiltered.length > 0 &&
        (() => {
          const recent = orders[0];
          return (
            <div className="mb-5">
              <p className="mb-2 text-sm font-medium">최근 주문 현황</p>
              <div className="rounded-xl border border-neutral-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">
                    {recent.order_type}배송 · {recent.total_amount.toLocaleString()}원
                  </span>
                  <OrderStatusBadge status={recent.status} />
                </div>
                <OrderJourney status={recent.status} />
              </div>
            </div>
          );
        })()}

      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">전체 주문</p>
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

      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-neutral-400">해당 주문이 없어요</p>
      )}

      <div className="space-y-2">
        {filtered.map((o) => {
          const isOpen = expandedId === o.id;
          const items = o.b2c_order_item ?? [];
          const thumbUrl = items.find((i) => i.product?.photo_url)?.product?.photo_url ?? null;
          const itemsSummary = items
            .map((i) => `${i.product?.name ?? "상품"} ${i.quantity}판`)
            .join(", ");
          return (
            <div key={o.id} className="rounded-xl border border-neutral-200 overflow-hidden">
              <button
                onClick={() => setExpandedId(isOpen ? null : o.id)}
                className="flex w-full items-center gap-3 p-4 text-left active:bg-neutral-50"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {thumbUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{itemsSummary || `${o.order_type}배송`}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {new Date(o.created_at).toLocaleDateString("ko-KR")} ·{" "}
                    {o.total_amount.toLocaleString()}원
                  </p>
                  {o.payment_confirmed_at && (
                    <p className="mt-0.5 text-[11px] text-neutral-400">
                      결제일 {new Date(o.payment_confirmed_at).toLocaleDateString("ko-KR")}
                    </p>
                  )}
                  {o.campaign?.delivery_date && (
                    <p className="mt-0.5 text-[11px] text-neutral-400">
                      도착예정 {new Date(o.campaign.delivery_date).toLocaleDateString("ko-KR")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
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
