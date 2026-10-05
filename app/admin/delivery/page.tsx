export const dynamic = "force-dynamic";

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/adminAuth";
import { getAllCampaigns } from "@/lib/campaign";
import { getSchedule } from "@/lib/schedule";
import { computeDeliverySlot, computeNextSlot, kstDateString } from "@/lib/scheduleShared";
import { decryptSensitive } from "@/lib/crypto";
import DeliveryClient from "./DeliveryClient";

const DELIVERABLE_STATUSES = ["배송중", "배송위임", "배송완료"];

export default async function DeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string; date?: string }>;
}) {
  await requirePermission(["delivery"]);
  const { campaign: campaignId, date: dateParam } = await searchParams;

  const admin = createAdminClient();
  const schedule = await getSchedule();
  const now = new Date();
  const slot = computeDeliverySlot(now, schedule);
  const nextSlot = computeNextSlot(slot, schedule);
  const today = kstDateString(now);

  // 날짜 버튼 목록: 최근 2주 안에 주문이 있는 배송일 + 앞으로 올 배송일 2개
  const since = kstDateString(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000));
  const { data: dateRows } = await admin
    .from("b2c_order")
    .select("delivery_date")
    .gte("delivery_date", since)
    .in("status", DELIVERABLE_STATUSES.concat(["입금확인완료", "입금대기"]))
    .limit(2000);
  const dateSet = new Set<string>([slot.date, nextSlot.date]);
  for (const r of dateRows ?? []) if (r.delivery_date) dateSet.add(r.delivery_date);
  const dates = Array.from(dateSet).sort();

  // 선택된 날짜: 지정이 없으면 오늘 이후 가장 가까운 배송일
  const selectedDate = dateParam ?? (campaignId ? null : dates.find((d) => d >= today) ?? slot.date);

  const campaigns = await getAllCampaigns();

  let orders: any[] = [];
  const select =
    "id, account_id, status, total_amount, created_at, delivery_photo_url, account(nickname, phone, address, address_dong, address_ho, entrance_password), b2c_order_item(quantity, product(name))";
  if (selectedDate) {
    const { data } = await admin
      .from("b2c_order")
      .select(select)
      .eq("delivery_date", selectedDate)
      .in("status", DELIVERABLE_STATUSES);
    orders = data ?? [];
  } else if (campaignId) {
    const { data } = await admin
      .from("b2c_order")
      .select(select)
      .eq("campaign_id", campaignId)
      .in("status", DELIVERABLE_STATUSES);
    orders = data ?? [];
  }
  // entrance_password는 암호화 저장돼있어서 복호화해서 넘겨줌
  orders = orders.map((o: any) => ({
    ...o,
    account: o.account
      ? { ...o.account, entrance_password: decryptSensitive(o.account.entrance_password) || null }
      : null,
  }));

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
    <div className="pb-24">
      <header className="flex items-center gap-2 bg-white px-5 py-4">
        <Link href="/admin/operations" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-bold">배송 리스트</h1>
      </header>
      <DeliveryClient
        dates={dates}
        todayDate={today}
        selectedDate={selectedDate}
        campaigns={campaigns}
        selectedCampaignId={campaignId ?? null}
        orders={orders}
      />
    </div>
  );
}
