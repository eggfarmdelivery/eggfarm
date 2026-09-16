"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { createB2BOrder } from "./actions";
import QuantityStepper from "@/components/QuantityStepper";
import Spinner from "@/components/Spinner";

type Product = { id: string; name: string; price: number };

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function B2BOrderForm({
  products,
  minOrderQty,
  isWindowOpen,
}: {
  products: Product[];
  minOrderQty: number;
  isWindowOpen: boolean;
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
  const belowMinQty = minOrderQty > 0 && totalQty > 0 && totalQty < minOrderQty;
  const belowMinimum = belowMinQty;

  async function handleSubmit(formData: FormData) {
    // <form action={fn}> 방식은 트랜지션으로 처리돼서 처리중 상태가 화면에 안 그려지고
    // 넘어가버리는 문제가 있었음(b2c에서도 같은 문제 겪음) - flushSync로 강제 즉시 렌더링
    flushSync(() => {
      setError(null);
      setPending(true);
    });
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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="px-5"
    >
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
        {isWindowOpen ? (
          <input
            type="date"
            name="desired_delivery_date"
            value={desiredDate}
            min={tomorrow()}
            onChange={(e) => setDesiredDate(e.target.value)}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
          />
        ) : (
          <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
            마감 이후 접수라 다음 영업일로 자동 배정돼요
          </p>
        )}
      </div>

      <div className="flex items-baseline justify-between mb-4">
        <span className="text-sm text-neutral-500">발주 총액</span>
        <span className="text-xl font-medium">{total.toLocaleString()}원</span>
      </div>

      {minOrderQty > 0 && (
        <p className="mb-3 text-xs font-medium text-red-500">
          최소 발주수량 {minOrderQty}판 이상부터 발주 가능해요
        </p>
      )}

      {belowMinQty && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
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
        {pending ? "처리 중..." : isWindowOpen ? "발주 요청" : "발주 요청 (승인 후 진행)"}
      </button>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-7 shadow-lg">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium text-neutral-700">발주 접수 중이에요...</p>
          </div>
        </div>
      )}
    </form>
  );
}
