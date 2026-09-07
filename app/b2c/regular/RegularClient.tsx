"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buyCreditPackage, createRegularOrder } from "./actions";
import Spinner from "@/components/Spinner";
import QuantityStepper from "@/components/QuantityStepper";

type Product = { id: string; name: string; base_price: number };

const CHARGE_PACKAGES = [50000, 100000, 300000];

export default function RegularClient({
  products,
  credit,
}: {
  products: Product[];
  credit: number;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const router = useRouter();

  const total = useMemo(
    () =>
      products.reduce((sum, p) => sum + (quantities[p.id] ?? 0) * p.base_price, 0),
    [products, quantities]
  );
  const remainingAfter = credit - total;
  const canSubmit = total > 0 && remainingAfter >= 0;

  async function handleBuy(amount: number) {
    setPending(true);
    setError(null);
    try {
      const result = await buyCreditPackage(amount);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("충전 처리 중 알 수 없는 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const result = await createRegularOrder(formData);
      if (!result.success) {
        setError(result.error);
        setPending(false);
        return;
      }
      router.push("/b2c/orders");
    } catch {
      setError("신청 처리 중 알 수 없는 오류가 발생했어요");
      setPending(false);
    }
  }

  return (
    <div className="px-5">
      <section className="rounded-xl bg-primary-bg p-4 mb-4">
        <p className="text-xs text-primary-dark mb-1">정기배송 잔여 크레딧</p>
        <p className="text-2xl font-medium text-primary-dark">
          {credit.toLocaleString()}원
        </p>
        <p className="mt-1 text-xs text-primary-dark/70">
          계란 선결제 개념이에요 · 배송비 무료
        </p>
      </section>

      <p className="text-xs text-neutral-500 mb-2">크레딧 충전 (테스트용 즉시지급)</p>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {CHARGE_PACKAGES.map((amount) => (
          <button
            key={amount}
            disabled={pending}
            onClick={() => handleBuy(amount)}
            className="flex items-center justify-center gap-1 rounded-lg border border-neutral-200 py-3 text-sm disabled:opacity-60"
          >
            {pending && <Spinner className="h-3.5 w-3.5" />}
            {(amount / 10000).toLocaleString()}만원
          </button>
        ))}
      </div>

      <form action={handleSubmit}>
        <p className="text-xs text-neutral-500 mb-1">이번 배송 상품</p>
        <div className="border-t border-neutral-200 mb-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border-b border-neutral-200 py-3"
            >
              <div>
                <span className="text-sm">{p.name}</span>
                <span className="ml-2 text-xs text-neutral-400">
                  {p.base_price.toLocaleString()}원/판
                </span>
              </div>
              <QuantityStepper
                name={`qty_${p.id}`}
                value={quantities[p.id] ?? 0}
                onChange={(v) => setQuantities((q) => ({ ...q, [p.id]: v }))}
              />
            </div>
          ))}
        </div>

        <div className="mb-4 flex items-baseline justify-between">
          <span className="text-xs text-neutral-500">차감될 금액</span>
          <span className="text-lg font-medium">{total.toLocaleString()}원</span>
        </div>

        {!canSubmit && total > 0 && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            크레딧이 부족해요 (부족액 {Math.abs(remainingAfter).toLocaleString()}원)
          </p>
        )}
        {error && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-white font-medium disabled:opacity-60"
        >
          {pending && <Spinner />}
          {pending
            ? "처리 중..."
            : total > 0
              ? `${total.toLocaleString()}원 크레딧 사용해서 배송 신청`
              : "상품을 선택해주세요"}
        </button>
      </form>
    </div>
  );
}
