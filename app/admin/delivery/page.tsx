export const dynamic = "force-dynamic";

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";
import { getAllCampaigns } from "@/lib/campaign";
import DeliveryClient from "./DeliveryClient";

const DELIVERABLE_STATUSES = ["입금확인완료", "배송중", "배송위임"];

export default async function DeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  await requireAdmin();
  const { campaign: campaignId } = await searchParams;

  const campaigns = await getAllCampaigns();
  const admin = createAdminClient();

  let orders: any[] = [];
  if (campaignId) {
    const { data } = await admin
      .from("b2c_order")
      .select(
        "id, status, total_amount, created_at, account(nickname, phone, address, address_dong, address_ho), b2c_order_item(quantity, product(name))"
      )
      .eq("campaign_id", campaignId)
      .in("status", DELIVERABLE_STATUSES);
    orders = data ?? [];
  }

  // 동/호수 순 정렬 (숫자 기준)
  orders.sort((a, b) => {
    const dongA = Number(a.account?.address_dong ?? 0);
    const dongB = Number(b.account?.address_dong ?? 0);
    if (dongA !== dongB) return dongA - dongB;
    const hoA = a.account?.address_ho ?? "";
    const hoB = b.account?.address_ho ?? "";
    return hoA.localeCompare(hoB);
  });

  return (
    <div className="pb-10">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">배송 리스트</h1>
      </header>
      <DeliveryClient campaigns={campaigns} selectedCampaignId={campaignId ?? null} orders={orders} />
    </div>
  );
}
