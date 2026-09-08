export const dynamic = "force-dynamic";

import Link from "next/link";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { maskPhone, maskUnit } from "@/lib/mask";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "./LogoutButton";
import OrdersClient from "@/app/b2c/orders/OrdersClient";

export default async function MyPage() {
  const accountId = await getAccountId("b2c");
  const sessionSupabase = await createClient();

  const { data: account } = await sessionSupabase
    .from("account")
    .select("name, phone, nickname, delivery_zone_id, address_dong, address_ho")
    .eq("id", accountId)
    .single();

  const { data: zone } = account?.delivery_zone_id
    ? await supabase
        .from("delivery_zone")
        .select("name")
        .eq("id", account.delivery_zone_id)
        .single()
    : { data: null };

  const { data: ledger } = await supabase
    .from("credit_ledger")
    .select("delta")
    .eq("account_id", accountId);
  const credit = (ledger ?? []).reduce((s, r) => s + r.delta, 0);

  const { data: orders } = await supabase
    .from("b2c_order")
    .select(
      "id, order_type, status, total_amount, delivery_photo_url, payment_confirmed_at, created_at, campaign(delivery_date), b2c_order_item(id, quantity, unit_price, product_id, product(name, photo_url))"
    )
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  const depositorName =
    account?.nickname && account?.phone
      ? `${account.nickname}${account.phone.replace(/\D/g, "").slice(-4)}`
      : null;

  return (
    <div className="pb-32">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">내 정보</h1>
      </header>

      <main className="px-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon.png"
              alt=""
              className="h-12 w-12 shrink-0 rounded-full bg-primary-bg p-1.5"
            />
            <div>
              <p className="text-base font-medium">{account?.name ?? "-"}</p>
              <p className="mt-0.5 text-sm text-neutral-500">
                크레딧 {credit.toLocaleString()}원
              </p>
            </div>
          </div>
          <Link href="/b2c/mypage/edit" aria-label="회원정보 수정" className="p-1.5 text-neutral-500">
            <Settings size={20} />
          </Link>
        </div>

        <div className="mb-6 rounded-xl border border-neutral-200 p-4 text-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 py-2 first:pt-0">
            <span className="text-neutral-500">전화번호</span>
            <span>{account?.phone ? maskPhone(account.phone) : "-"}</span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 py-2">
            <span className="text-neutral-500">닉네임</span>
            <span>{account?.nickname ?? "-"}</span>
          </div>
          {depositorName && (
            <div className="flex items-center justify-between border-b border-neutral-100 py-2">
              <span className="text-neutral-500">입금자명</span>
              <span className="font-medium text-primary-dark">{depositorName}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-2 last:pb-0">
            <span className="text-neutral-500">배송지</span>
            <span>
              {zone?.name
                ? `${zone.name} ${account?.address_dong}동 ${maskUnit(account?.address_ho ?? "")}호`
                : "-"}
            </span>
          </div>
        </div>

        <p className="mb-2 text-sm font-medium">주문내역</p>
        <OrdersClient orders={(orders as any) ?? []} />

        <div className="mt-5">
          <LogoutButton />
        </div>
      </main>

      <BottomNav active="/b2c/mypage" />
    </div>
  );
}
