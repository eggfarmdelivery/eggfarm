export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { getCurrentCampaign, getCampaignStatus } from "@/lib/campaign";
import CampaignClient from "./CampaignClient";

export default async function CampaignPage() {
  await requireAdmin();

  const campaign = await getCurrentCampaign();

  const { data: activeProducts } = await supabase
    .from("product")
    .select("id")
    .eq("is_active", true);
  const activeProductIds = (activeProducts ?? []).map((p) => p.id);

  const status = await getCampaignStatus(campaign, activeProductIds);

  return (
    <div className="pb-10">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">캠페인 관리</h1>
      </header>
      <CampaignClient campaign={campaign} status={status} />
    </div>
  );
}
