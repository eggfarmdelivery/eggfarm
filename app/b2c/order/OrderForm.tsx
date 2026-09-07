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

type CreditMode = "none" | "partial" | "full";

export default function OrderForm({
  products,
  address,
  bankInfo,
  credit,
  depositorName,
}: {
  products: Product[];
  address: string | null;
  bankInfo: Record<string, string>;
  credit: number;
  depositorName: string | null;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [paidTotal, setPaidTotal] = useState<number | null>(null);
  const [fullyPaidByCredit, setFullyPaidByCredit] = useState(false);
  const [creditMode, setCreditMode] = useState<CreditMode>(credit > 0 ? "full" : "none");
  const [partialCreditInput, setPartialCreditInput] = useState("");
  const router = useRouter();

  const total = products.reduce(
    (sum, p) => sum + (qty[p.id] ?? 0) * p.base_price,
    0
  );

  const partialCreditRaw = Number(partialCreditInput.replace(/\D/g, "") || 0);
  const creditToUse =
    creditMode === "full"
      ? Math.min(credit, total)
      : creditMode === "partial"
        ? Math.max(0, Math.min(partialCreditRaw, credit, total))
        : 0;
  const remainingCash = Math.max(0, total - creditToUse);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      formData.set("credit_to_use", String(creditToUse));
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
              <QuantityStepper
                name={`qty_${p.id}`}
                value={qty[p.id] ?? 0}
                onChange={(v) => setQty((prev) => ({ ...prev, [p.id]: v }))}
                max={p.perPersonLimit ?? undefined}
                limitMessage={
                  p.perPersonLimit ? `1인당 최대 ${p.perPersonLimit}판까지예요` : undefined
                }
              />
            )}
          </div>
        ))}
      </div>

      {credit > 0 && (
        <div className="mb-4">
          <p className="text-xs text-neutral-500 mb-1">
            크레딧 사용 (보유 {credit.toLocaleString()}원)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setCreditMode("none")}
              className={`rounded-lg border py-2 text-xs ${
                creditMode === "none"
                  ? "border-primary bg-primary-bg text-primary"
                  : "border-neutral-200 text-neutral-600"
              }`}
            >
              사용 안 함
            </button>
            <button
              type="button"
              onClick={() => setCreditMode("partial")}
              className={`rounded-lg border py-2 text-xs ${
                creditMode === "partial"
                  ? "border-primary bg-primary-bg text-primary"
                  : "border-neutral-200 text-neutral-600"
              }`}
            >
              일부 사용
            </button>
            <button
              type="button"
              onClick={() => setCreditMode("full")}
              className={`rounded-lg border py-2 text-xs ${
                creditMode === "full"
                  ? "border-primary bg-primary-bg text-primary"
                  : "border-neutral-200 text-neutral-600"
              }`}
            >
              전액 사용
            </button>
          </div>
          {creditMode === "partial" && (
            <input
              value={partialCreditInput}
              onChange={(e) => setPartialCreditInput(e.target.value)}
              inputMode="numeric"
              placeholder="사용할 금액을 입력해주세요"
              className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
            />
          )}
          {creditMode !== "none" && total > 0 && (
            <p className="mt-1.5 text-xs text-neutral-400">
              크레딧 {creditToUse.toLocaleString()}원 사용 · 입금할 금액{" "}
              {remainingCash.toLocaleString()}원
            </p>
          )}
        </div>
      )}

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
          depositorName={depositorName}
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
