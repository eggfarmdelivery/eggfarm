"use client";

import { useRef, useState } from "react";
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

type B2COrder = {
  id: string;
  order_type: string;
  status: string;
  is_overflow: boolean;
  total_amount: number;
  created_at: string;
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
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("order_id", orderId);
      formData.set("photo", file);
      await onSubmit(formData);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "처리 중 오류가 발생했어요");
      setPending(false);
      setFileName(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => fileRef.current?.click()}
        className="text-xs rounded-md bg-primary text-white px-3 py-1.5 disabled:opacity-50"
      >
        {pending ? "업로드 중..." : label}
      </button>
      {fileName && !pending && (
        <span className="text-xs text-neutral-400">{fileName}</span>
      )}
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

export default function ConsoleClient({
  b2cOrders,
  b2bOrders,
}: {
  b2cOrders: B2COrder[];
  b2bOrders: B2BOrder[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  async function run(id: string, fn: () => Promise<void>) {
    setBusy(id);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "처리 중 오류가 발생했어요");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-5 space-y-6">
      <section>
        <h2 className="text-sm font-medium mb-2">B2C 주문 ({b2cOrders.length})</h2>
        <div className="space-y-2">
          {b2cOrders.length === 0 && (
            <p className="text-sm text-neutral-400 py-4">처리할 주문이 없어요</p>
          )}
          {b2cOrders.map((o) => (
            <div key={o.id} className="rounded-lg border border-neutral-200 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">
                  {o.order_type}배송 · {o.total_amount.toLocaleString()}원
                </span>
                <span className="text-xs text-neutral-500">{o.status}</span>
              </div>
              {o.is_overflow && (
                <p className="text-xs text-orange-600 mb-2">⚠ 재고 초과분 - 승인 필요</p>
              )}
              <div className="flex gap-2 flex-wrap items-center">
                {o.is_overflow && (
                  <>
                    <button
                      disabled={busy === o.id}
                      onClick={() => run(o.id, () => approveOverflow(o.id))}
                      className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
                    >
                      초과분 승인
                    </button>
                    <button
                      disabled={busy === o.id}
                      onClick={() => run(o.id, () => rejectOverflow(o.id))}
                      className="text-xs rounded-md border border-neutral-300 px-3 py-1.5"
                    >
                      거절
                    </button>
                  </>
                )}
                {o.status === "입금대기" && !o.is_overflow && (
                  <button
                    disabled={busy === o.id}
                    onClick={() => run(o.id, () => confirmB2CPayment(o.id))}
                    className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
                  >
                    입금확인
                  </button>
                )}
                {(o.status === "입금확인완료" || o.status === "배송위임") && (
                  <PhotoUploadButton
                    orderId={o.id}
                    label="배송완료 사진 촬영/업로드"
                    onSubmit={markB2CDelivered}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-2">B2B 발주 ({b2bOrders.length})</h2>
        <div className="space-y-2">
          {b2bOrders.length === 0 && (
            <p className="text-sm text-neutral-400 py-4">처리할 발주가 없어요</p>
          )}
          {b2bOrders.map((o) => (
            <div key={o.id} className="rounded-lg border border-neutral-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">
                  {o.account?.business_name ?? "거래처"} · {o.total_amount.toLocaleString()}원
                </span>
                <span className="text-xs text-neutral-500">{o.status}</span>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                {o.status === "발주요청" && (
                  <button
                    disabled={busy === o.id}
                    onClick={() => run(o.id, () => startB2BDelivery(o.id))}
                    className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
                  >
                    배송시작
                  </button>
                )}
                {o.status === "배송중" && (
                  <PhotoUploadButton
                    orderId={o.id}
                    label="배송완료 사진 촬영/업로드 (입금요청 알림)"
                    onSubmit={markB2BDelivered}
                  />
                )}
                {o.status === "입금대기" && (
                  <button
                    disabled={busy === o.id}
                    onClick={() => run(o.id, () => confirmB2BPayment(o.id))}
                    className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
                  >
                    입금확인
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
