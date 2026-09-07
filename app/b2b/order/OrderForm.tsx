"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createB2BOrder } from "./actions";

type Product = { id: string; name: string; price: number };

export default function B2BOrderForm({ products }: { products: Product[] }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const total = products.reduce(
    (sum, p) => sum + (qty[p.id] ?? 0) * p.price,
    0
  );

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = await createB2BOrder(formData);
      if (!result.success) {
        setError(result.error);
        setPending(false);
        return;
      }
      router.push("/b2b/orders");
    } catch {
      setError("발주 처리 중 알 수 없는 오류가 발생했어요");
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="px-5">
      <div className="border-t border-neutral-200 mb-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between border-b border-neutral-200 py-3"
          >
            <div>
              <p className="text-sm">{p.name}</p>
              <p className="text-xs text-neutral-400">
                {p.price.toLocaleString()}원/판
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
        <span className="text-sm text-neutral-500">발주 총액</span>
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
        {pending ? "처리 중..." : "발주 요청"}
      </button>
    </form>
  );
}
