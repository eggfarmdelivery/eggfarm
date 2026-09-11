export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { getAllCampaigns, getCampaignProductLimits, getCampaignZoneIds, getCampaignStatus } from "@/lib/campaign";
import CampaignClient from "./CampaignClient";

export default async function CampaignPage() {
  await requireAdmin();

  const campaigns = await getAllCampaigns();
  const campaignsWithInfo = await Promise.all(
    campaigns.map(async (campaign) => {
      const productLimits = await getCampaignProductLimits(campaign.id);
      const zoneIds = await getCampaignZoneIds(campaign.id);
      const status = await getCampaignStatus(campaign, productLimits);
      return { campaign, productLimits, zoneIds, status };
    })
  );

  const { data: activeProducts } = await supabase
    .from("product")
    .select("id, name, base_price")
    .eq("is_active", true)
    .order("base_price", { ascending: false });

  const { data: zones } = await supabase
    .from("delivery_zone")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (
    <div className="pb-24">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin/operations" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">캠페인 관리</h1>
      </header>
      <CampaignClient
        campaigns={campaignsWithInfo}
        products={activeProducts ?? []}
        zones={zones ?? []}
      />
    </div>
  );
}
