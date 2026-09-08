export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/getAccount";
import { isSoldOut, getCurrentLimit, getRemainingStock } from "@/lib/limits";
import { getConfigs } from "@/lib/settings";
import { getCurrentCampaign, getCampaignStatus, getCampaignProductIds, isOpenStatus } from "@/lib/campaign";
import BottomNav from "@/components/BottomNav";
import OrderForm from "./OrderForm";
import CampaignClosedView from "./CampaignClosedView";

export default async function GeneralOrderPage() {
  const accountId = await getAccountId("b2c");
  const sessionSupabase = await createClient();

  const campaign = await getCurrentCampaign();
  const campaignProductIds = campaign ? await getCampaignProductIds(campaign.id) : [];

  const { data: allProducts } = await supabase
    .from("product")
    .select("id, name, base_price, photo_url")
    .eq("is_active", true)
    .order("base_price", { ascending: false });

  // 캠페인에 포함된 상품만 주문화면에 노출 (캠페인 없으면 아무것도 안 보임)
  const products = (allProducts ?? []).filter((p) => campaignProductIds.includes(p.id));

  const productsWithStock = await Promise.all(
    products.map(async (p) => {
      const limit = await getCurrentLimit(p.id);
      return {
        ...p,
        soldOut: await isSoldOut(p.id),
        perPersonLimit: limit?.per_person_limit ?? null,
        remainingStock: await getRemainingStock(p.id),
      };
    })
  );

  const { data: account } = await sessionSupabase
    .from("account")
    .select("address, nickname, phone")
    .eq("id", accountId)
    .single();

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

  const campaignStatus = await getCampaignStatus(campaign, campaignProductIds);

  return (
    <div className="pb-32">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/b2c" aria-label="뒤로가기">
          ←
        </Link>
        <h1 className="text-base font-medium">일반배송 주문</h1>
      </header>

      {isOpenStatus(campaignStatus) ? (
        <OrderForm
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
