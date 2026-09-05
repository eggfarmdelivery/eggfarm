"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGeneralOrder } from "./actions";

type Product = { id: string; name: string; base_price: number };

export default function OrderForm({
  products,
  zoneName,
}: {
  products: Product[];
  zoneName: string | null;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const total = products.reduce(
    (sum, p) => sum + (qty[p.id] ?? 0) * p.base_price,
    0
  );

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await createGeneralOrder(formData);
      router.push("/b2c/orders");
    } catch (e) {
      setError(e instanceof Error ? e.message : "주문 처리 중 오류가 발생했어요");
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="px-5">
      <p className="text-xs text-neutral-500 mb-1">배송 단지</p>
      <div className="mb-4 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-600">
        {zoneName ?? "등록된 배송단지가 없어요 (관리자에게 문의)"}
      </div>

      <p className="text-xs text-neutral-500 mb-1">상품 선택</p>
      <div className="border-t border-neutral-200 mb-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between border-b border-neutral-200 py-3"
          >
            <div>
              <p className="text-sm">{p.name}</p>
              <p className="text-xs text-neutral-400">
                {p.base_price.toLocaleString()}원/판
              </p>
            </div>
            <input
              type="number"
              name={`qty_${p.id}`}
              min={0}
              defaultValue={0}
              onChange={(e) =>
                setQty((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))
              }
              className="w-16 rounded-md border border-neutral-200 px-2 py-1.5 text-center text-sm"
            />
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
        className="w-full rounded-lg bg-primary py-3 text-white font-medium disabled:opacity-50"
      >
        {pending ? "처리 중..." : "주문하기"}
      </button>
    </form>
  );
}
