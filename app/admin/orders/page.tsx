export const dynamic = "force-dynamic";

import Link from "next/link";
import { Users } from "lucide-react";
import { requirePermission } from "@/lib/adminAuth";
import { getB2COrdersData } from "../ordersData";
import ConsoleClient from "../ConsoleClient";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const role = await requirePermission(["payment"]);
  const b2cOrders = await getB2COrdersData();

  return (
    <div className="pb-24">
      <header className="flex items-center gap-2 px-5 py-4">
        {role === "owner" && (
          <Link href="/admin/operations" aria-label="뒤로가기" className="text-lg">
            ←
          </Link>
        )}
        <h1 className="flex-1 text-base font-medium">B2C 주문관리</h1>
        {role !== "owner" && (
          <Link
            href="/admin/b2b-orders"
            className="mr-2 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600"
          >
            B2B 주문 보기
          </Link>
        )}
        <Link
          href="/admin/members"
          className="flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600"
        >
          <Users size={14} />
          회원 조회
        </Link>
      </header>

      <ConsoleClient
        initialB2cStatus={status}
        b2cOrders={(b2cOrders as any) ?? []}
        b2bOrders={[]}
        b2bAccountsWithPrices={[]}
        initialTab="b2c"
        hideTabs
      />
    </div>
  );
}
