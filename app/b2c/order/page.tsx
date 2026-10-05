export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/getAccount";
import { getConfigs } from "@/lib/settings";
import { getSchedule } from "@/lib/schedule";
import { computeDeliverySlot, computeNextSlot, formatKoDate } from "@/lib/scheduleShared";
import { getPersonQtyForDate } from "@/lib/stock";
import BottomNav from "@/components/BottomNav";
import OrderForm from "./OrderForm";

export default async function GeneralOrderPage() {
  const accountId = await getAccountId("b2c");
  const sessionSupabase = await createClient();

  const { data: account } = await sessionSupabase
    .from("account")
    .select("address, nickname, phone, delivery_zone_id")
    .eq("id", accountId)
    .single();

  let zoneOk = false;
  if (account?.delivery_zone_id) {
    const { data: zone } = await supabase
      .from("delivery_zone")
      .select("is_active")
      .eq("id", account.delivery_zone_id)
      .maybeSingle();
    zoneOk = !!zone && zone.is_active !== false;
  }

  const schedule = await getSchedule();
  const slot = computeDeliverySlot(new Date(), schedule);
  const nextSlot = computeNextSlot(slot, schedule);

  const { data: products } = await supabase
    .from("product")
    .select("id, name, base_price, photo_url, stock_qty")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const alreadyQty = await getPersonQtyForDate(accountId, slot.date);

  const depositorNickname = account?.nickname && account?.phone ? account.nickname : null;
  const depositorPhoneSuffix =
    account?.nickname && account?.phone ? account.phone.replace(/\D/g, "").slice(-4) : null;
  const bankInfo = await getConfigs(["bank_name", "bank_account", "bank_holder"]);

  return (
    <div className="pb-32">
      <header className="flex items-center gap-2 bg-white px-5 py-4">
        <Link href="/b2c" aria-label="뒤로가기">
          ←
        </Link>
        <h1 className="text-base font-bold">주문하기</h1>
      </header>

      {!zoneOk ? (
        <div className="px-5 pt-4">
          <div className="rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center">
            <p className="text-sm text-neutral-600">
              회원님의 단지는 현재 배송이 어려워요. 마이페이지에서 단지를 확인해주세요
            </p>
          </div>
        </div>
      ) : (
        <OrderForm
          products={(products ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            base_price: p.base_price,
            photo_url: p.photo_url,
            stock: Math.max(0, p.stock_qty ?? 0),
          }))}
          address={account?.address ?? null}
          bankInfo={bankInfo}
          depositorNickname={depositorNickname}
          depositorPhoneSuffix={depositorPhoneSuffix}
          deliveryFee={schedule.fee}
          freeShippingMinQty={schedule.freeMinQty}
          perPersonLimit={schedule.perPersonLimit}
          alreadyQty={alreadyQty}
          deliveryDateLabel={formatKoDate(slot.date)}
          cutoffLabel={`${formatKoDate(slot.date)} ${schedule.cutoff}`}
          startLabel={schedule.start}
          nextDateLabel={formatKoDate(nextSlot.date)}
        />
      )}
      <BottomNav active="/b2c" />
    </div>
  );
}
