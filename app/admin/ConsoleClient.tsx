"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveOverflow,
  rejectOverflow,
  confirmB2CPayment,
  markB2CDelivered,
  startB2BDelivery,
  markB2BDelivered,
  confirmB2BPayment,
} from "./actions";
import Spinner from "@/components/Spinner";

type B2COrder = {
  id: string;
  order_type: string;
  status: string;
  is_overflow: boolean;
  total_amount: number;
  created_at: string;
  account: { name: string | null; phone: string | null } | null;
};

type B2BOrder = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  account: { business_name: string | null } | null;
};

function PhotoUploadButton({
  orderId,
  label,
  onSubmit,
}: {
  orderId: string;
  label: string;
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}) {
  const [pending, setPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("order_id", orderId);
      formData.set("photo", file);
      const result = await onSubmit(formData);
      if (!result.success) {
        alert(result.error ?? "처리 중 오류가 발생했어요");
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      alert("처리 중 알 수 없는 오류가 발생했어요");
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1.5 text-xs rounded-md bg-primary text-white px-3 py-1.5 disabled:opacity-50"
      >
        {pending && <Spinner className="h-3 w-3" />}
        {pending ? "업로드 중..." : label}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

// B2C 카드 하나 (상태에 맞는 액션 버튼 포함)
function B2COrderCard({ order, onAction }: { order: B2COrder; onAction: () => void }) {
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(true);
    try {
      const result = await fn();
      if (!result.success) {
        alert(result.error ?? "처리 중 오류가 발생했어요");
        return;
      }
      onAction();
    } catch {
      alert("처리 중 알 수 없는 오류가 발생했어요");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">
          {order.account?.name ?? "이름없음"}
          {order.account?.phone ? ` · ${order.account.phone.slice(-4)}` : ""}
        </span>
        <span className="text-xs text-neutral-500">{order.status}</span>
      </div>
      <p className="text-xs text-neutral-500 mb-1">
        {order.order_type}배송 · {order.total_amount.toLocaleString()}원
      </p>
      {order.is_overflow && (
        <p className="text-xs text-orange-600 mb-2">⚠ 재고 초과분 - 승인 필요</p>
      )}
      <div className="flex gap-2 flex-wrap items-center">
        {order.is_overflow && (
          <>
            <button
              disabled={busy}
              onClick={() => run(() => approveOverflow(order.id))}
              className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
            >
              초과분 승인
            </button>
            <button
              disabled={busy}
              onClick={() => run(() => rejectOverflow(order.id))}
              className="text-xs rounded-md border border-neutral-300 px-3 py-1.5"
            >
              거절
            </button>
          </>
        )}
        {order.status === "입금대기" && !order.is_overflow && (
          <button
            disabled={busy}
            onClick={() => run(() => confirmB2CPayment(order.id))}
            className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
          >
            입금확인
          </button>
        )}
        {(order.status === "입금확인완료" || order.status === "배송위임") && (
          <PhotoUploadButton
            orderId={order.id}
            label="배송완료 사진"
            onSubmit={markB2CDelivered}
          />
        )}
      </div>
    </div>
  );
}

function B2BOrderCard({ order, onAction }: { order: B2BOrder; onAction: () => void }) {
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(true);
    try {
      const result = await fn();
      if (!result.success) {
        alert(result.error ?? "처리 중 오류가 발생했어요");
        return;
      }
      onAction();
    } catch {
      alert("처리 중 알 수 없는 오류가 발생했어요");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">
          {order.account?.business_name ?? "거래처"} · {order.total_amount.toLocaleString()}원
        </span>
        <span className="text-xs text-neutral-500">{order.status}</span>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        {order.status === "발주요청" && (
          <button
            disabled={busy}
            onClick={() => run(() => startB2BDelivery(order.id))}
            className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
          >
            배송시작
          </button>
        )}
        {order.status === "배송중" && (
          <PhotoUploadButton
            orderId={order.id}
            label="배송완료 사진(입금요청 알림)"
            onSubmit={markB2BDelivered}
          />
        )}
        {order.status === "입금대기" && (
          <button
            disabled={busy}
            onClick={() => run(() => confirmB2BPayment(order.id))}
            className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
          >
            입금확인
          </button>
        )}
      </div>
    </div>
  );
}

// 상태 탭 바 (공통)
function StatusTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs whitespace-nowrap ${
            active === t.key
              ? "bg-primary text-white font-medium"
              : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {t.label} {t.count}
        </button>
      ))}
    </div>
  );
}

export default function ConsoleClient({
  b2cOrders,
  b2bOrders,
}: {
  b2cOrders: B2COrder[];
  b2bOrders: B2BOrder[];
}) {
  const [topTab, setTopTab] = useState<"b2c" | "b2b">("b2c");
  const [b2cStatusTab, setB2cStatusTab] = useState("전체");
  const [b2bStatusTab, setB2bStatusTab] = useState("전체");
  const router = useRouter();
  const refresh = () => router.refresh();

  const b2cTabs = useMemo(() => {
    const overflowCount = b2cOrders.filter((o) => o.is_overflow).length;
    const order = ["입금대기", "입금확인완료", "배송위임", "배송완료", "승인거절", "취소"];
    const counts: Record<string, number> = {};
    for (const o of b2cOrders) counts[o.status] = (counts[o.status] ?? 0) + 1;
    const tabs = [{ key: "전체", label: "전체", count: b2cOrders.length }];
    if (overflowCount > 0)
      tabs.push({ key: "초과승인대기", label: "초과승인대기", count: overflowCount });
    for (const s of order) {
      if (counts[s]) tabs.push({ key: s, label: s, count: counts[s] });
    }
    return tabs;
  }, [b2cOrders]);

  const b2bTabs = useMemo(() => {
    const order = ["발주요청", "배송중", "입금대기", "입금확인완료", "취소"];
    const counts: Record<string, number> = {};
    for (const o of b2bOrders) counts[o.status] = (counts[o.status] ?? 0) + 1;
    const tabs = [{ key: "전체", label: "전체", count: b2bOrders.length }];
    for (const s of order) {
      if (counts[s]) tabs.push({ key: s, label: s, count: counts[s] });
    }
    return tabs;
  }, [b2bOrders]);

  const filteredB2c = b2cOrders.filter((o) => {
    if (b2cStatusTab === "전체") return true;
    if (b2cStatusTab === "초과승인대기") return o.is_overflow;
    return o.status === b2cStatusTab;
  });

  const filteredB2b = b2bOrders.filter((o) =>
    b2bStatusTab === "전체" ? true : o.status === b2bStatusTab
  );

  return (
    <div className="px-5">
      <div className="mb-4 flex gap-2 border-b border-neutral-200">
        <button
          onClick={() => setTopTab("b2c")}
          className={`px-3 py-2 text-sm ${
            topTab === "b2c"
              ? "border-b-2 border-primary font-semibold text-primary"
              : "text-neutral-400"
          }`}
        >
          B2C ({b2cOrders.length})
        </button>
        <button
          onClick={() => setTopTab("b2b")}
          className={`px-3 py-2 text-sm ${
            topTab === "b2b"
              ? "border-b-2 border-primary font-semibold text-primary"
              : "text-neutral-400"
          }`}
        >
          B2B ({b2bOrders.length})
        </button>
      </div>

      {topTab === "b2c" ? (
        <>
          <StatusTabs tabs={b2cTabs} active={b2cStatusTab} onChange={setB2cStatusTab} />
          <div className="space-y-2">
            {filteredB2c.length === 0 && (
              <p className="text-sm text-neutral-400 py-6 text-center">해당 상태의 주문이 없어요</p>
            )}
            {filteredB2c.map((o) => (
              <B2COrderCard key={o.id} order={o} onAction={refresh} />
            ))}
          </div>
        </>
      ) : (
        <>
          <StatusTabs tabs={b2bTabs} active={b2bStatusTab} onChange={setB2bStatusTab} />
          <div className="space-y-2">
            {filteredB2b.length === 0 && (
              <p className="text-sm text-neutral-400 py-6 text-center">해당 상태의 발주가 없어요</p>
            )}
            {filteredB2b.map((o) => (
              <B2BOrderCard key={o.id} order={o} onAction={refresh} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
