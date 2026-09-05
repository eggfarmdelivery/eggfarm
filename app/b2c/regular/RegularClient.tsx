"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buyCreditPackage, createRegularOrder } from "./actions";

type Product = { id: string; name: string; base_price: number };

const PACKAGES = [10, 30, 50];

export default function RegularClient({
  products,
  credit,
}: {
  products: Product[];
  credit: number;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleBuy(count: number) {
    setPending(true);
    setError(null);
    try {
      await buyCreditPackage(count);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "구매 처리 중 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await createRegularOrder(formData);
      router.push("/b2c/orders");
    } catch (e) {
      setError(e instanceof Error ? e.message : "신청 처리 중 오류가 발생했어요");
      setPending(false);
    }
  }

  return (
    <div className="px-5">
      <section className="rounded-xl bg-primary-bg p-4 mb-4">
        <p className="text-xs text-primary-dark mb-1">정기배송 잔여 크레딧</p>
        <p className="text-2xl font-medium text-primary-dark">{credit}회 남음</p>
      </section>

      <p className="text-xs text-neutral-500 mb-2">크레딧 구매 (테스트용 즉시지급)</p>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {PACKAGES.map((n) => (
          <button
            key={n}
            disabled={pending}
            onClick={() => handleBuy(n)}
            className="rounded-lg border border-neutral-200 py-3 text-sm disabled:opacity-50"
          >
            {n}회
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
              <span className="text-sm">{p.name}</span>
              <input
                type="number"
                name={`qty_${p.id}`}
                min={0}
                defaultValue={0}
                className="w-16 rounded-md border border-neutral-200 px-2 py-1.5 text-center text-sm"
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || credit <= 0}
          className="w-full rounded-lg bg-primary py-3 text-white font-medium disabled:opacity-50"
        >
          크레딧 1회 사용해서 배송 신청
        </button>
      </form>
    </div>
  );
}
