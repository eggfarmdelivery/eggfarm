"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addLimitSchedule } from "./actions";

export default function LimitForm({
  productId,
  current,
}: {
  productId: string;
  current: { stock_limit: number; overflow_rate: number; per_person_limit: number | null } | null;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      await addLimitSchedule(formData);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-2">
      <input type="hidden" name="product_id" value={productId} />
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">적용일자</span>
        <input
          type="date"
          name="effective_date"
          defaultValue={today}
          className="w-36 rounded-md border border-neutral-200 px-2 py-1 text-sm"
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">기준 재고(판)</span>
        <input
          type="number"
          name="stock_limit"
          defaultValue={current?.stock_limit ?? 100}
          className="w-24 rounded-md border border-neutral-200 px-2 py-1 text-sm text-right"
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">초과허용 비율(%)</span>
        <input
          type="number"
          name="overflow_rate"
          defaultValue={current ? current.overflow_rate * 100 : 30}
          className="w-24 rounded-md border border-neutral-200 px-2 py-1 text-sm text-right"
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">1인당 최대구매(판)</span>
        <input
          type="number"
          name="per_person_limit"
          defaultValue={current?.per_person_limit ?? ""}
          className="w-24 rounded-md border border-neutral-200 px-2 py-1 text-sm text-right"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary py-2 text-sm text-white disabled:opacity-50"
      >
        저장
      </button>
    </form>
  );
}
