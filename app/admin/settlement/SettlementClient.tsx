"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { markSettlementTransferred } from "./actions";
import type { DetailRow } from "./data";

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

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

// v41: ◀ 월 ▶ 이동 + 요약 + 거래처를 누르면 납품 상세가 2줄 목록으로 펼쳐짐
export default function SettlementClient({
  rows,
  monthLabel,
  settlementMonth,
  monthValue,
  prevMonth,
  nextMonth,
  basePath,
}: {
  rows: Row[];
  monthLabel: string;
  settlementMonth: string;
  monthValue: string;
  prevMonth: string;
  nextMonth: string;
  /** 월을 바꿀 때 이동할 주소 (정산 화면 / 정산·기록 화면) */
  basePath: string;
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
  const pending = rows.reduce((s, r) => s + r.pendingAmount, 0);
  const go = (mv: string) => router.push(`${basePath}?month=${mv}`);

  return (
    <section className="flex flex-col gap-3 px-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-neutral-500">B2B 정산 · {monthLabel}</h2>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => go(prevMonth)} aria-label="이전 달" className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-700">
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[72px] text-center text-[15px] font-bold">{monthValue.replace("-", ".")}</span>
          <button type="button" onClick={() => go(nextMonth)} aria-label="다음 달" className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-700">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 rounded-2xl bg-neutral-50 px-4 py-[18px]">
        <span className="text-[13px] text-neutral-500">입금확인된 발주 합계</span>
        <span className="text-[28px] font-bold tracking-tight">{won(total)}</span>
        <div className="mt-1.5 flex gap-4 text-[13px]">
          <span className="text-orange-700">결제대기 {won(pending)}</span>
        </div>
      </div>

      <div className="flex flex-col">
        {rows.length === 0 && (
          <p className="py-4 text-center text-sm text-neutral-500">이 달 확정된 발주가 없어요</p>
        )}
        {rows.map((r) => {
          const open = openId === r.accountId;
          return (
            <div key={r.accountId} className="flex flex-col border-b border-neutral-100">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : r.accountId)}
                aria-expanded={open}
                className="flex min-h-[52px] items-center gap-2.5 text-left"
              >
                <span className="flex-1 text-[15px]">
                  {r.businessName} <span className="text-[13px] text-neutral-500">· {r.orderCount}건</span>
                </span>
                <span className="text-[15px] font-medium">{won(r.totalAmount)}</span>
                {r.settlementStatus === "이체완료" && (
                  <span className="rounded-md bg-primary-bg px-2 py-0.5 text-xs font-bold text-primary">이체완료</span>
                )}
                <ChevronDown size={16} className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {r.pendingCount > 0 && (
                <p className="-mt-2 mb-2 text-xs text-orange-700">
                  결제대기 {r.pendingCount}건 ({won(r.pendingAmount)})
                </p>
              )}

              {open && (
                <div className="mb-3 flex flex-col rounded-xl bg-neutral-50 px-3 py-1">
                  {r.detail.length === 0 ? (
                    <p className="py-3 text-xs text-neutral-500">상세 내역이 없어요</p>
                  ) : (
                    r.detail.map((d, i) => (
                      <div key={i} className="flex flex-col gap-0.5 border-b border-neutral-200/70 py-2.5 last:border-0">
                        <div className="flex justify-between text-sm">
                          <span>
                            <span className="text-neutral-500">
                              {d.date ? `${new Date(d.date).getMonth() + 1}.${String(new Date(d.date).getDate()).padStart(2, "0")}` : "-"}
                            </span>
                            {" · "}
                            {d.product}
                          </span>
                          <span className="font-bold">{won(d.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-neutral-500">
                          <span>
                            {d.quantity}판 × {won(d.unitPrice)}
                          </span>
                          <span>{d.paymentMethod ?? "-"}</span>
                        </div>
                      </div>
                    ))
                  )}
                  {r.settlementStatus !== "이체완료" && (
                    <button
                      disabled={busy === r.accountId || r.totalAmount === 0}
                      onClick={() => handleTransfer(r)}
                      className="my-2 h-10 rounded-lg bg-primary text-sm font-bold text-white disabled:opacity-50"
                    >
                      이체완료 처리
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
