export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/getAccount";
import { getConfigs } from "@/lib/settings";
import {
  getCampaignById,
  getOpenCampaigns,
  getCampaignStatus,
  getCampaignProductLimits,
  getCampaignZoneIds,
  getCampaignRemainingStock,
  isCampaignProductSoldOut,
  isOpenStatus,
  type Campaign,
  type CampaignProductLimit,
  type CampaignStatus,
} from "@/lib/campaign";
import BottomNav from "@/components/BottomNav";
import OrderForm from "./OrderForm";
import CampaignClosedView from "./CampaignClosedView";

export default async function GeneralOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { campaign: campaignIdParam } = await searchParams;
  const accountId = await getAccountId("b2c");
  const sessionSupabase = await createClient();

  const { data: account } = await sessionSupabase
    .from("account")
    .select("address, nickname, phone, delivery_zone_id")
    .eq("id", accountId)
    .single();
  const myZoneId = account?.delivery_zone_id ?? null;

  // 특정 캠페인이 지정됐으면 그걸, 아니면 지금 오픈중인 캠페인 중 첫 번째를 사용
  // (여러 캠페인이 동시에 열려있을 수 있음 - 홈화면 카드에서 캠페인별로 링크를 눌러 들어옴)
  let campaign: Campaign | null = null;
  let productLimits: CampaignProductLimit[] = [];
  let campaignStatus: CampaignStatus | "none" = "none";
  let zoneMismatch = false;

  if (campaignIdParam) {
    campaign = await getCampaignById(campaignIdParam);
    if (campaign) {
      const zoneIds = await getCampaignZoneIds(campaign.id);
      if (!myZoneId || !zoneIds.includes(myZoneId)) {
        zoneMismatch = true;
        campaign = null;
      } else {
        productLimits = await getCampaignProductLimits(campaign.id);
        campaignStatus = await getCampaignStatus(campaign, productLimits);
      }
    }
  } else {
    const open = await getOpenCampaigns(myZoneId);
    if (open.length > 0) {
      campaign = open[0].campaign;
      productLimits = open[0].productLimits;
      campaignStatus = "open";
    }
  }

  const productIds = productLimits.map((l) => l.product_id);
  const { data: allProducts } = await supabase
    .from("product")
    .select("id, name, base_price, photo_url")
    .in("id", productIds.length > 0 ? productIds : ["00000000-0000-0000-0000-000000000000"]);

  const productsWithStock = await Promise.all(
    (allProducts ?? []).map(async (p) => {
      const limit = productLimits.find((l) => l.product_id === p.id)!;
      return {
        ...p,
        soldOut: campaign
          ? await isCampaignProductSoldOut(campaign.id, p.id, limit.stock_limit)
          : false,
        perPersonLimit: limit.per_person_limit,
        remainingStock: campaign
          ? await getCampaignRemainingStock(campaign.id, p.id, limit.stock_limit)
          : 0,
      };
    })
  );

  const { data: ledger } = await supabase
    .from("credit_ledger")
    .select("delta")
    .eq("account_id", accountId);
  const credit = (ledger ?? []).reduce((s, r) => s + r.delta, 0);

  const depositorName =
    account?.nickname && account?.phone
      ? `${account.nickname}${account.phone.replace(/\D/g, "").slice(-4)}`
      : null;

  const bankInfo = await getConfigs(["bank_name", "bank_account", "bank_holder"]);

  return (
    <div className="pb-32">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/b2c" aria-label="뒤로가기">
          ←
        </Link>
        <h1 className="text-base font-medium">일반배송 주문</h1>
      </header>

      {zoneMismatch ? (
        <div className="px-5">
          <div className="rounded-xl bg-neutral-50 px-4 py-8 text-center">
            <p className="text-sm text-neutral-600">
              이 캠페인은 회원님의 단지에서는 이용할 수 없어요
            </p>
          </div>
        </div>
      ) : isOpenStatus(campaignStatus as CampaignStatus) && campaign ? (
        <OrderForm
          campaignId={campaign.id}
          products={productsWithStock}
          address={account?.address ?? null}
          bankInfo={bankInfo}
          credit={credit}
          depositorName={depositorName}
        />
      ) : (
        <CampaignClosedView products={productsWithStock} status={campaignStatus} campaign={campaign} />
      )}
      <BottomNav active="/b2c" />
    </div>
  );
}
