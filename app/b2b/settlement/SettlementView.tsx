"use client";

import { useRouter } from "next/navigation";

type DetailRow = {
  date: string;
  product: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  paymentMethod: string | null;
};

export default function SettlementView({
  detail,
  totalAmount,
  pendingAmount,
  pendingCount,
  monthLabel,
  monthValue,
}: {
  detail: DetailRow[];
  totalAmount: number;
  pendingAmount: number;
  pendingCount: number;
  monthLabel: string;
  monthValue: string;
}) {
  const router = useRouter();

  return (
    <div className="px-5">
      <div className="mb-3">
        <input
          type="month"
          defaultValue={monthValue}
          onChange={(e) => router.push(`/b2b/settlement?month=${e.target.value}`)}
          className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm"
        />
      </div>

      <div className="rounded-xl bg-primary-bg p-4 mb-4">
        <p className="mb-1 text-xs text-primary-dark">{monthLabel} 납품 총액</p>
        <p className="text-xl font-medium text-primary-dark">{totalAmount.toLocaleString()}원</p>
        {pendingCount > 0 && (
          <p className="mt-1 text-xs text-orange-600">
            결제대기 {pendingCount}건 ({pendingAmount.toLocaleString()}원) - 확인 중이에요
          </p>
        )}
      </div>

      {detail.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">이번달 납품 내역이 없어요</p>
      ) : (
        <div className="rounded-md bg-neutral-50 p-2.5">
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
              {detail.map((d, i) => (
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
        </div>
      )}
    </div>
  );
}
