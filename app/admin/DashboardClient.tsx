"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, X, Check } from "lucide-react";
import Spinner from "@/components/Spinner";
import { confirmB2CPayment, confirmB2BPayment, revertB2CStatus, revertB2BStatus } from "./actions";

export type DashOrder = {
  createdAt: string;
  paidAt: string | null;
  amount: number;
  cancelled: boolean;
  stillWaiting: boolean;
};

export type WaitingOrder = {
  id: string;
  name: string;
  sub: string;
  amount: number;
  at: string;
  atLabel: string;
};

type Side = {
  orders: DashOrder[];
  waiting: WaitingOrder[];
  toShip: number;
  shipping: number;
  extra: { label: string; count: number; href: string }[];
};

type Tab = "b2c" | "b2b";
type Period = "1d" | "3d" | "1w" | "1m";

const PERIODS: { id: Period; label: string; days: number }[] = [
  { id: "1d", label: "오늘", days: 1 },
  { id: "3d", label: "3일", days: 3 },
  { id: "1w", label: "1주", days: 7 },
  { id: "1m", label: "1달", days: 30 },
];

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const md = (d: Date) => `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
const mdhm = (iso: string) => {
  const d = new Date(iso);
  return `${md(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function DashboardClient({ b2c, b2b }: { b2c: Side; b2b: Side }) {
  const [tab, setTab] = useState<Tab>("b2c");
  const [period, setPeriod] = useState<Period>("3d");
  const [sheetOpen, setSheetOpen] = useState(false);
  const side = tab === "b2c" ? b2c : b2b;
  const isB2C = tab === "b2c";

  // 기간 시작 = (오늘 0시) - (일수-1)일. 예: 3일 = 그제 0시부터 지금까지
  const { start, rangeLabel } = useMemo(() => {
    const days = PERIODS.find((p) => p.id === period)!.days;
    const s = new Date();
    s.setHours(0, 0, 0, 0);
    s.setDate(s.getDate() - (days - 1));
    const today = new Date();
    return { start: s.getTime(), rangeLabel: days === 1 ? `${md(today)} 하루` : `${md(s)} ~ ${md(today)}` };
  }, [period]);

  const stats = useMemo(() => {
    const ordered = side.orders.filter((o) => new Date(o.createdAt).getTime() >= start);
    const paid = side.orders.filter(
      (o) => o.paidAt && new Date(o.paidAt).getTime() >= start && !o.stillWaiting && !o.cancelled
    );
    return {
      orderedCount: ordered.length,
      orderedAmount: ordered.filter((o) => !o.cancelled).reduce((s, o) => s + o.amount, 0),
      paidCount: paid.length,
      paidAmount: paid.reduce((s, o) => s + o.amount, 0),
    };
  }, [side, start]);

  const now = new Date();
  const nowLabel = `${md(now)} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} 기준`;

  const ordersHref = isB2C ? "/admin/orders" : "/admin/b2b-orders";
  const shipHref = isB2C ? "/admin/delivery" : "/admin/b2b-delivery";

  return (
    <div className="min-h-screen bg-white pb-28 text-neutral-900">
      <header className="flex flex-col gap-4 px-5 pt-5">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[22px] font-bold tracking-tight">현황</h1>
          <span className="text-xs text-neutral-500">{nowLabel}</span>
        </div>

        <div role="tablist" aria-label="고객 구분" className="grid grid-cols-2 rounded-xl bg-neutral-100 p-1">
          {(["b2c", "b2b"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`h-10 rounded-[9px] text-[15px] ${
                tab === t ? "bg-white font-bold shadow-sm" : "font-medium text-neutral-500"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div role="group" aria-label="조회 기간" className="flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={period === p.id}
                onClick={() => setPeriod(p.id)}
                className={`h-9 flex-1 rounded-full border text-sm ${
                  period === p.id
                    ? "border-primary bg-primary font-bold text-white"
                    : "border-neutral-200 bg-white text-neutral-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <span className="text-right text-xs text-neutral-500">{rangeLabel}</span>
        </div>
      </header>

      <main className="flex flex-col gap-3 px-5 pt-3">
        {/* 지금 처리할 것: 입금 확인 → 시트에서 바로 처리 */}
        {side.waiting.length > 0 && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex min-h-[52px] items-center gap-2.5 rounded-2xl bg-orange-50 px-4 text-left text-orange-900"
          >
            <span aria-hidden className="h-2 w-2 flex-none rounded-full bg-orange-600" />
            <span className="flex-1 text-[15px]">
              입금 확인할 주문 <b>{side.waiting.length}건</b>
            </span>
            <span className="text-sm font-bold">바로 확인</span>
            <ChevronRight size={16} />
          </button>
        )}
        {side.extra
          .filter((e) => e.count > 0)
          .map((e) => (
            <Link
              key={e.label}
              href={e.href}
              className="flex min-h-[44px] items-center gap-2.5 rounded-2xl bg-orange-50 px-4 text-sm text-orange-900"
            >
              <span aria-hidden className="h-2 w-2 flex-none rounded-full bg-orange-600" />
              <span className="flex-1">
                {e.label} <b>{e.count}건</b>
              </span>
              <ChevronRight size={16} />
            </Link>
          ))}

        <StatLink href={ordersHref} label="주문 들어옴" value={`${stats.orderedCount}건`} sub={won(stats.orderedAmount)} />
        <StatLink href={ordersHref} label="입금확인 처리" value={`${stats.paidCount}건`} sub={won(stats.paidAmount)} />
        <Link
          href={shipHref}
          className="flex items-center gap-3.5 rounded-2xl bg-primary px-[18px] py-5 text-white"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-white/80">배송해야 할 것 · 지금 기준</span>
            <span className="text-[30px] font-bold leading-tight tracking-tight">{side.toShip}건</span>
            <span className="text-[13px] text-white/80">
              {isB2C ? "입금확인 끝, 아직 배송 전" : "주문확정, 아직 배송 전"}
              {side.shipping > 0 ? ` · 배송중 ${side.shipping}건` : ""}
            </span>
          </div>
          <ChevronRight size={18} />
        </Link>
      </main>

      {sheetOpen && (
        <PaymentSheet tab={tab} orders={side.waiting} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  );
}

function StatLink({ href, label, value, sub }: { href: string; label: string; value: string; sub: string }) {
  return (
    <Link href={href} className="flex items-center gap-3.5 rounded-2xl border border-neutral-200 px-[18px] py-5">
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="text-sm text-neutral-500">{label}</span>
        <span className="text-[30px] font-bold leading-tight tracking-tight">{value}</span>
        <span className="text-[13px] text-neutral-500">{sub}</span>
      </div>
      <ChevronRight size={18} className="text-neutral-400" />
    </Link>
  );
}

// 현황에서 바로 입금확인 처리하는 하단 시트 (운영 > 주문관리와 같은 서버 기능을 그대로 씀)
function PaymentSheet({ tab, orders, onClose }: { tab: Tab; orders: WaitingOrder[]; onClose: () => void }) {
  const router = useRouter();
  const [done, setDone] = useState<Record<string, string>>({}); // id → 처리방법(B2C는 "확인")
  const [busy, setBusy] = useState<string | null>(null);
  const isB2C = tab === "b2c";
  const left = orders.filter((o) => !done[o.id]).length;

  async function confirm(id: string, method?: "계좌이체" | "현금") {
    setBusy(id);
    const res = isB2C ? await confirmB2CPayment(id) : await confirmB2BPayment(id, method!);
    setBusy(null);
    if (!res.success) {
      alert(res.error);
      return;
    }
    setDone((d) => ({ ...d, [id]: method ?? "확인" }));
  }

  async function undo(id: string) {
    setBusy(id);
    const res = isB2C ? await revertB2CStatus(id) : await revertB2BStatus(id);
    setBusy(null);
    if (!res.success) {
      alert(res.error);
      return;
    }
    setDone((d) => {
      const n = { ...d };
      delete n[id];
      return n;
    });
  }

  function close() {
    onClose();
    router.refresh(); // 처리한 결과가 현황 숫자에 반영되도록
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={close}>
      <section
        aria-label="입금 확인 대기"
        className="mx-auto flex max-h-[85vh] w-full max-w-md flex-col gap-3.5 rounded-t-[22px] bg-white px-5 pb-8 pt-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-neutral-300" />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {isB2C ? "입금 확인 대기" : "B2B 입금 확인 대기"} <span className="text-orange-700">{left}건</span>
          </h2>
          <button type="button" onClick={close} aria-label="닫기" className="-mr-2.5 flex h-11 w-11 items-center justify-center text-neutral-500">
            <X size={20} />
          </button>
        </div>
        <p className="-mt-2 text-[13px] text-neutral-500">
          {isB2C ? "통장 입금 내역과 이름·금액을 맞춰보고 눌러주세요" : "받은 방법(계좌이체 / 현금)을 골라 확인해주세요"}
        </p>

        <div className="flex flex-col gap-2.5 overflow-y-auto">
          {orders.map((o) => {
            const m = done[o.id];
            const isBusy = busy === o.id;
            return (
              <div key={o.id} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-base font-bold">{o.name}</span>
                  <span className="whitespace-nowrap text-base font-bold">{won(o.amount)}</span>
                </div>
                <div className="flex flex-col gap-0.5 text-[13px] text-neutral-500">
                  {o.sub && <span>{o.sub}</span>}
                  <span>
                    {o.atLabel} {mdhm(o.at)}
                  </span>
                </div>
                {!m ? (
                  isB2C ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => confirm(o.id)}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-bold text-white disabled:opacity-60"
                    >
                      {isBusy && <Spinner className="h-3.5 w-3.5" />}
                      입금확인
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => confirm(o.id, "계좌이체")}
                        className="h-11 rounded-xl bg-primary text-[15px] font-bold text-white disabled:opacity-60"
                      >
                        계좌이체 확인
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => confirm(o.id, "현금")}
                        className="h-11 rounded-xl border border-primary bg-white text-[15px] font-bold text-primary disabled:opacity-60"
                      >
                        현금 확인
                      </button>
                    </div>
                  )
                ) : (
                  <div className="flex h-11 items-center gap-2 rounded-xl bg-primary-bg px-3 text-sm font-bold text-primary">
                    <Check size={18} />
                    <span className="flex-1">
                      {isB2C ? "입금확인 완료 → 배송할 것으로 이동" : `${m}로 입금확인 완료`}
                    </span>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => undo(o.id)}
                      className="h-8 text-[13px] font-normal underline disabled:opacity-60"
                    >
                      되돌리기
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
