"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markSettlementTransferred } from "./actions";
import Badge from "@/components/Badge";
import { Wallet, ChevronDown } from "lucide-react";

type DetailRow = {
  date: string;
  product: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  paymentMethod: string | null;
};

type Row = {
  accountId: string;
  businessName: string;
  orderCount: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  detail: DetailRow[];
  settlementStatus: "대기" | "이체완료";
};

export default function SettlementClient({
  rows,
  monthLabel,
  settlementMonth,
  monthValue,
}: {
  rows: Row[];
  monthLabel: string;
  settlementMonth: string;
  monthValue: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const router = useRouter();

  async function handleTransfer(row: Row) {
    setBusy(row.accountId);
    try {
      const result = await markSettlementTransferred(row.accountId, settlementMonth, row.totalAmount);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.refresh();
    } catch {
      alert("처리 중 알 수 없는 오류가 발생했어요");
    } finally {
      setBusy(null);
    }
  }

  const total = rows.reduce((s, r) => s + r.totalAmount, 0);

  return (
    <div className="px-5">
      <div className="mb-3">
        <input
          type="month"
          defaultValue={monthValue}
          onChange={(e) => router.push(`/admin/settlement?month=${e.target.value}`)}
          className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm"
        />
      </div>

      <div className="rounded-xl bg-primary-bg p-4 mb-4">
        <p className="mb-1 flex items-center gap-1.5 text-xs text-primary-dark">
          <Wallet size={13} /> {monthLabel} 정산 총액
        </p>
        <p className="text-xl font-medium text-primary-dark">{total.toLocaleString()}원</p>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="text-sm text-neutral-400 py-6 text-center">이번달 확정된 발주가 없어요</p>
        )}
        {rows.map((r) => {
          const open = openId === r.accountId;
          return (
            <div key={r.accountId} className="rounded-lg border border-neutral-200 p-3">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : r.accountId)}
                className="flex w-full items-center justify-between mb-1"
              >
                <span className="text-sm">{r.businessName}</span>
                <span className="flex items-center gap-1 text-sm font-medium">
                  {r.totalAmount.toLocaleString()}원
                  <ChevronDown size={14} className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
                </span>
              </button>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  발주 {r.orderCount}건
                  {r.pendingCount > 0 && ` · 결제대기 ${r.pendingCount}건(${r.pendingAmount.toLocaleString()}원)`}
                </span>
                {r.settlementStatus === "이체완료" ? (
                  <Badge tone="green">이체완료</Badge>
                ) : (
                  <button
                    disabled={busy === r.accountId || r.totalAmount === 0}
                    onClick={() => handleTransfer(r)}
                    className="text-xs rounded-md bg-primary text-white px-3 py-1.5 disabled:opacity-50"
                  >
                    이체완료 처리
                  </button>
                )}
              </div>

              {open && (
                <div className="mt-3 rounded-md bg-neutral-50 p-2.5">
                  {r.detail.length === 0 ? (
                    <p className="text-xs text-neutral-400">상세 내역이 없어요</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-neutral-400">
                          <th className="pb-1.5 text-left font-normal">날짜</th>
                          <th className="pb-1.5 text-left font-normal">품목</th>
                          <th className="pb-1.5 text-right font-normal">단가</th>
                          <th className="pb-1.5 text-right font-normal">수량</th>
                          <th className="pb-1.5 text-right font-normal">소계</th>
                          <th className="pb-1.5 text-right font-normal">결제</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.detail.map((d, i) => (
                          <tr key={i} className="border-t border-neutral-200">
                            <td className="py-1.5">
                              {d.date ? new Date(d.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "-"}
                            </td>
                            <td className="py-1.5">{d.product}</td>
                            <td className="py-1.5 text-right">{d.unitPrice.toLocaleString()}</td>
                            <td className="py-1.5 text-right">{d.quantity}</td>
                            <td className="py-1.5 text-right">{d.subtotal.toLocaleString()}</td>
                            <td className="py-1.5 text-right text-neutral-400">{d.paymentMethod ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
