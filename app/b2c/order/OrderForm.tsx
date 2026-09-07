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
  soldOut: boolean;
  perPersonLimit: number | null;
};

export default function OrderForm({
  products,
  address,
  bankInfo,
}: {
  products: Product[];
  address: string | null;
  bankInfo: Record<string, string>;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [paidTotal, setPaidTotal] = useState<number | null>(null);
  const [fullyPaidByCredit, setFullyPaidByCredit] = useState(false);
  const router = useRouter();

  const total = products.reduce(
    (sum, p) => sum + (qty[p.id] ?? 0) * p.base_price,
    0
  );

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = await createGeneralOrder(formData);
      if (!result.success) {
        setError(result.error);
        setPending(false);
        return;
      }
      if (result.remainingAmount > 0) {
        setPaidTotal(result.remainingAmount);
      } else {
        setFullyPaidByCredit(true);
      }
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
            className="flex items-center justify-between border-b border-neutral-200 py-3"
          >
            <div>
              <p className="text-sm">
                {p.name}
                {p.soldOut && (
                  <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                    품절
                  </span>
                )}
              </p>
              <p className="text-xs text-neutral-400">
                {p.base_price.toLocaleString()}원/판
              </p>
            </div>
            {p.soldOut ? (
              <span className="text-xs text-neutral-400">주문 불가</span>
            ) : (
              <QuantityStepper
                name={`qty_${p.id}`}
                value={qty[p.id] ?? 0}
                onChange={(v) => setQty((prev) => ({ ...prev, [p.id]: v }))}
                max={p.perPersonLimit ?? undefined}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-baseline justify-between mb-4">
        <span className="text-sm text-neutral-500">결제 예정 금액</span>
        <span className="text-xl font-medium">{total.toLocaleString()}원</span>
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
          onClose={() => router.push("/b2c/orders")}
        />
      )}

      {fullyPaidByCredit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <p className="mb-1 text-base font-medium">주문이 완료됐어요</p>
            <p className="mb-4 text-sm text-neutral-500">
              보유 크레딧으로 전액 결제됐어요. 입금하실 금액은 없어요
            </p>
            <button
              type="button"
              onClick={() => router.push("/b2c/orders")}
              className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-white"
            >
              확인했어요
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
