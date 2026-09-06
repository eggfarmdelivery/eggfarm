"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadDeliveryPhoto } from "@/lib/supabase";
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

export default function ConsoleClient({
  b2cOrders,
  b2bOrders,
}: {
  b2cOrders: B2COrder[];
  b2bOrders: B2BOrder[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingActionRef = useRef<{
    orderId: string;
    action: (photoUrl: string) => Promise<void>;
  } | null>(null);
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

  async function handlePhotoUpload(
    orderId: string,
    action: (photoUrl: string) => Promise<void>
  ) {
    pendingActionRef.current = { orderId, action };
    fileInputRef.current?.click();
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pendingActionRef.current) return;

    const { orderId, action } = pendingActionRef.current;
    setUploading(true);
    setBusy(orderId);

    try {
      const photoUrl = await uploadDeliveryPhoto(file);
      await action(photoUrl);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "처리 중 오류가 발생했어요");
    } finally {
      setUploading(false);
      setBusy(null);
      pendingActionRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileSelected}
        hidden
      />
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
              <div className="flex gap-2 flex-wrap">
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
                  <button
                    disabled={busy === o.id || uploading}
                    onClick={() =>
                      handlePhotoUpload(o.id, (photoUrl) =>
                        markB2CDelivered(o.id, photoUrl)
                      )
                    }
                    className="text-xs rounded-md bg-primary text-white px-3 py-1.5 disabled:opacity-50"
                  >
                    {uploading ? "업로드 중..." : "배송완료 처리"}
                  </button>
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
              <div className="flex gap-2 flex-wrap">
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
                  <button
                    disabled={busy === o.id || uploading}
                    onClick={() =>
                      handlePhotoUpload(o.id, (photoUrl) =>
                        markB2BDelivered(o.id, photoUrl)
                      )
                    }
                    className="text-xs rounded-md bg-primary text-white px-3 py-1.5 disabled:opacity-50"
                  >
                    {uploading ? "업로드 중..." : "배송완료 (입금요청 알림)"}
                  </button>
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
    </>
  );
}
