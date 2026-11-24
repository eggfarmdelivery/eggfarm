export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireOwner } from "@/lib/adminAuth";
import SettlementClient from "../settlement/SettlementClient";
import { getSettlementData } from "../settlement/data";

// v41 정산·기록 개편: B2B 월 정산을 이 화면에서 바로 보여주고, 견적/이력은 아래 목록으로
export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireOwner();
  const { month } = await searchParams;
  const data = await getSettlementData(month);

  const links = [
    { href: "/admin/quotes", label: "견적 문의" },
    { href: "/admin/logs", label: "상태변경 이력", sub: "B2C·B2B" },
  ];

  return (
    <div className="min-h-screen bg-white pb-28 text-neutral-900">
      <header className="px-5 pb-5 pt-5">
        <h1 className="text-[22px] font-bold tracking-tight">정산·기록</h1>
      </header>

      <SettlementClient {...data} basePath="/admin/records" />

      <section className="mt-7 flex flex-col px-5">
        <h2 className="mb-1.5 text-[13px] font-bold text-neutral-500">기록</h2>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="flex min-h-[52px] items-center gap-2.5 border-b border-neutral-100">
            <span className="flex-1 text-[15px]">
              {l.label} {l.sub && <span className="text-[13px] text-neutral-500">{l.sub}</span>}
            </span>
            <ChevronRight size={16} className="text-neutral-400" />
          </Link>
        ))}
      </section>
    </div>
  );
}
