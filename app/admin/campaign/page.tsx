export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { getAllCampaigns, getCampaignProductIds, getCampaignStatus } from "@/lib/campaign";
import CampaignClient from "./CampaignClient";

export default async function CampaignPage() {
  await requireAdmin();

  const campaigns = await getAllCampaigns();
  const campaignsWithInfo = await Promise.all(
    campaigns.map(async (campaign) => {
      const productIds = await getCampaignProductIds(campaign.id);
      const status = await getCampaignStatus(campaign, productIds);
      return { campaign, productIds, status };
    })
  );

  const { data: activeProducts } = await supabase
    .from("product")
    .select("id, name")
    .eq("is_active", true)
    .order("base_price", { ascending: false });

  return (
    <div className="pb-10">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">캠페인 관리</h1>
      </header>
      <CampaignClient campaigns={campaignsWithInfo} products={activeProducts ?? []} />
    </div>
  );
}
