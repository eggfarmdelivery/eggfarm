"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Tab = "b2c" | "b2b";

type MenuItem = { href: string; label: string; badge?: string };

export default function OperationsClient({
  b2c,
  b2b,
}: {
  b2c: { waiting: number; beforeShip: number; toDeliver: number; lowStock: number; zoneRequests: number };
  b2b: { newOrders: number; waiting: number; toDeliver: number };
}) {
  const [tab, setTab] = useState<Tab>("b2c");
  const isB2C = tab === "b2c";

  const daily = isB2C
    ? [
        { href: "/admin/orders", label: "주문관리", sub: `입금대기 ${b2c.waiting} · 배송 전 ${b2c.beforeShip}` },
        { href: "/admin/delivery", label: "배송 리스트", sub: `배송할 것 ${b2c.toDeliver}건` },
      ]
    : [
        { href: "/admin/b2b-orders", label: "주문관리", sub: `새 발주 ${b2b.newOrders} · 입금대기 ${b2b.waiting}` },
        { href: "/admin/b2b-delivery", label: "배송 리스트", sub: `배송할 것 ${b2b.toDeliver}건` },
      ];

  const manage: MenuItem[] = isB2C
    ? [
        { href: "/admin/stock", label: "상품·재고 관리", badge: b2c.lowStock > 0 ? `부족 ${b2c.lowStock}` : undefined },
        { href: "/admin/schedule", label: "배송 설정" },
        { href: "/admin/zones", label: "배송가능 단지" },
        {
          href: "/admin/zone-requests",
          label: "단지 추가 요청",
          badge: b2c.zoneRequests > 0 ? `최근 7일 ${b2c.zoneRequests}` : undefined,
        },
        { href: "/admin/members", label: "회원 조회" },
        { href: "/admin/campaign", label: "이전 캠페인 기록" },
      ]
    : [
        { href: "/admin/b2b-accounts", label: "거래처 관리" },
        { href: "/admin/members", label: "회원 조회" },
      ];

  return (
    <div className="min-h-screen bg-white pb-28 text-neutral-900">
      <header className="flex flex-col gap-4 px-5 pt-5">
        <h1 className="text-[22px] font-bold tracking-tight">운영</h1>
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
      </header>

      <main className="flex flex-col gap-6 px-5 pt-6">
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-bold text-neutral-500">매일</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {daily.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="flex h-28 flex-col justify-between rounded-2xl bg-neutral-50 p-4"
              >
                <span className="text-base font-bold">{m.label}</span>
                <span className="text-[13px] text-neutral-500">{m.sub}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="flex flex-col">
          <h2 className="mb-1.5 text-[13px] font-bold text-neutral-500">관리</h2>
          {manage.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="flex min-h-[52px] items-center gap-2.5 border-b border-neutral-100"
            >
              <span className="flex-1 text-[15px]">{m.label}</span>
              {m.badge && (
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-700">{m.badge}</span>
              )}
              <ChevronRight size={16} className="text-neutral-400" />
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
