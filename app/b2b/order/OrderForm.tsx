"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createB2BOrder } from "./actions";
import QuantityStepper from "@/components/QuantityStepper";

type Product = { id: string; name: string; price: number };

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function B2BOrderForm({
  products,
  minOrderAmount,
  minOrderQty,
}: {
  products: Product[];
  minOrderAmount: number;
  minOrderQty: number;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [desiredDate, setDesiredDate] = useState(tomorrow());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const total = products.reduce(
    (sum, p) => sum + (qty[p.id] ?? 0) * p.price,
    0
  );
  const totalQty = Object.values(qty).reduce((s, v) => s + v, 0);
  const belowMinAmount = minOrderAmount > 0 && total > 0 && total < minOrderAmount;
  const belowMinQty = minOrderQty > 0 && totalQty > 0 && totalQty < minOrderQty;
  const belowMinimum = belowMinAmount || belowMinQty;

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
            <QuantityStepper
              name={`qty_${p.id}`}
              value={qty[p.id] ?? 0}
              onChange={(v) => setQty((prev) => ({ ...prev, [p.id]: v }))}
            />
          </div>
        ))}
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-xs text-neutral-500">희망 배송일</label>
        <input
          type="date"
          name="desired_delivery_date"
          value={desiredDate}
          min={tomorrow()}
          onChange={(e) => setDesiredDate(e.target.value)}
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-baseline justify-between mb-4">
        <span className="text-sm text-neutral-500">발주 총액</span>
        <span className="text-xl font-medium">{total.toLocaleString()}원</span>
      </div>

      {(minOrderAmount > 0 || minOrderQty > 0) && (
        <p className="mb-3 text-xs text-neutral-400">
          {minOrderAmount > 0 && `최소 발주금액 ${minOrderAmount.toLocaleString()}원`}
          {minOrderAmount > 0 && minOrderQty > 0 && " · "}
          {minOrderQty > 0 && `최소 발주수량 ${minOrderQty}판`}
        </p>
      )}

      {belowMinAmount && (
        <p className="mb-2 rounded-md bg-orange-50 px-3 py-2 text-sm text-orange-600">
          최소 발주금액({minOrderAmount.toLocaleString()}원)보다 적어요
        </p>
      )}
      {belowMinQty && (
        <p className="mb-3 rounded-md bg-orange-50 px-3 py-2 text-sm text-orange-600">
          최소 발주수량({minOrderQty}판)보다 적어요
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || total === 0 || belowMinimum}
        className="w-full rounded-lg bg-primary py-3 text-white font-medium disabled:opacity-50"
      >
        {pending ? "처리 중..." : "발주 요청"}
      </button>
    </form>
  );
}
