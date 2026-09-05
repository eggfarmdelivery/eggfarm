"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markSettlementTransferred } from "./actions";

type Row = {
  accountId: string;
  businessName: string;
  orderCount: number;
  totalAmount: number;
  settlementStatus: "대기" | "이체완료";
};

export default function SettlementClient({
  rows,
  monthLabel,
  settlementMonth,
}: {
  rows: Row[];
  monthLabel: string;
  settlementMonth: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  async function handleTransfer(row: Row) {
    setBusy(row.accountId);
    try {
      await markSettlementTransferred(row.accountId, settlementMonth, row.totalAmount);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setBusy(null);
    }
  }

  const total = rows.reduce((s, r) => s + r.totalAmount, 0);

  return (
    <div className="px-5">
      <div className="rounded-xl bg-primary-bg p-4 mb-4">
        <p className="text-xs text-primary-dark mb-1">{monthLabel} 정산 총액</p>
        <p className="text-xl font-medium text-primary-dark">
          {total.toLocaleString()}원
        </p>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="text-sm text-neutral-400 py-6 text-center">
            이번달 확정된 발주가 없어요
          </p>
        )}
        {rows.map((r) => (
          <div key={r.accountId} className="rounded-lg border border-neutral-200 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">{r.businessName}</span>
              <span className="text-sm font-medium">
                {r.totalAmount.toLocaleString()}원
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">발주 {r.orderCount}건</span>
              {r.settlementStatus === "이체완료" ? (
                <span className="text-xs text-green-700">이체완료</span>
              ) : (
                <button
                  disabled={busy === r.accountId}
                  onClick={() => handleTransfer(r)}
                  className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
                >
                  이체완료 처리
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
