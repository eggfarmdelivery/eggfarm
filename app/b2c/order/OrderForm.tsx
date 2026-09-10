"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGeneralOrder } from "./actions";
import Spinner from "@/components/Spinner";
import QuantityStepper from "@/components/QuantityStepper";
import PaymentInfoModal, { type BankInfo } from "@/components/PaymentInfoModal";

type Product = {
  id: string;
  name: string;
  base_price: number;
  photo_url: string | null;
  soldOut: boolean;
  perPersonLimit: number | null;
  remainingStock: number | null;
};

export default function OrderForm({
  campaignId,
  products,
  address,
  bankInfo,
  depositorName,
}: {
  campaignId: string;
  products: Product[];
  address: string | null;
  bankInfo: Record<string, string>;
  depositorName: string | null;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [paidTotal, setPaidTotal] = useState<number | null>(null);
  const router = useRouter();

  const total = products.reduce(
    (sum, p) => sum + (qty[p.id] ?? 0) * p.base_price,
    0
  );

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      formData.set("campaign_id", campaignId);
      const result = await createGeneralOrder(formData);
      if (!result.success) {
        setError(result.error);
        setPending(false);
        return;
      }
      setPaidTotal(result.remainingAmount);
    } catch {
      setError("주문 처리 중 알 수 없는 오류가 발생했어요");
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="px-5">
      <p className="text-xs text-neutral-500 mb-1">배송 주소</p>
      <div className="mb-4 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-600">
        {address ?? "등록된 주소가 없어요 (마이페이지에서 입력해주세요)"}
      </div>

      <p className="text-xs text-neutral-500 mb-1">상품 선택</p>
      <div className="border-t border-neutral-200 mb-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between border-b border-neutral-200 py-3 gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              {p.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.photo_url}
                  alt={p.name}
                  className="h-12 w-12 shrink-0 rounded-md object-cover bg-neutral-100"
                />
              ) : (
                <div className="h-12 w-12 shrink-0 rounded-md bg-neutral-100" />
              )}
              <div className="min-w-0">
                <p className="text-sm truncate">
                  {p.name}
                  {p.soldOut && (
                    <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                      품절
                    </span>
                  )}
                </p>
                <p className="text-xs text-neutral-400">
                  {p.base_price.toLocaleString()}원/판
                  {!p.soldOut && p.remainingStock !== null && (
                    <span className="ml-1.5 text-neutral-400">
                      · 잔여 {p.remainingStock.toLocaleString()}판
                    </span>
                  )}
                </p>
              </div>
            </div>
            {p.soldOut ? (
              <span className="shrink-0 text-xs text-neutral-400">주문 불가</span>
            ) : (
              (() => {
                const caps = [p.perPersonLimit, p.remainingStock].filter(
                  (v): v is number => v !== null
                );
                const effectiveMax = caps.length ? Math.min(...caps) : undefined;
                const limitMessage =
                  effectiveMax !== undefined &&
                  p.remainingStock !== null &&
                  effectiveMax === p.remainingStock
                    ? `재고가 ${p.remainingStock}판 남았어요`
                    : p.perPersonLimit
                      ? `1인당 최대 ${p.perPersonLimit}판까지예요`
                      : undefined;
                return (
                  <QuantityStepper
                    name={`qty_${p.id}`}
                    value={qty[p.id] ?? 0}
                    onChange={(v) => setQty((prev) => ({ ...prev, [p.id]: v }))}
                    max={effectiveMax}
                    limitMessage={limitMessage}
                  />
                );
              })()
            )}
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-baseline justify-between rounded-lg bg-neutral-50 p-3">
        <span className="text-sm font-medium text-neutral-700">입금할 금액</span>
        <span className="text-xl font-semibold text-red-500">{total.toLocaleString()}원</span>
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || total === 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-white font-medium disabled:opacity-60"
      >
        {pending && <Spinner />}
        {pending ? "처리 중..." : "주문하기"}
      </button>

      {paidTotal !== null && (
        <PaymentInfoModal
          bankInfo={bankInfo as BankInfo}
          amount={paidTotal}
          depositorName={depositorName}
          onClose={() => router.push("/b2c/mypage")}
        />
      )}
    </form>
  );
}
