export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireOwner } from "@/lib/adminAuth";
import SettlementClient from "./SettlementClient";
import { getSettlementData } from "./data";

export default async function SettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireOwner();
  const { month } = await searchParams;
  const data = await getSettlementData(month);

  return (
    <div className="pb-24">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin/records" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">B2B 정산</h1>
      </header>
      <SettlementClient {...data} basePath="/admin/settlement" />
    </div>
  );
}
