export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { decryptSensitive } from "@/lib/crypto";
import BottomNav from "@/components/BottomNav";
import EditProfileClient from "./EditProfileClient";
import LogoutButton from "./LogoutButton";
import MyPageTabs from "./MyPageTabs";
import OrdersClient from "@/app/b2c/orders/OrdersClient";

export default async function MyPage() {
  const accountId = await getAccountId("b2c");
  const sessionSupabase = await createClient();

  const { data: account } = await sessionSupabase
    .from("account")
    .select(
      "name, phone, nickname, delivery_zone_id, address_dong, address_ho, entrance_password"
    )
    .eq("id", accountId)
    .single();

  const { data: zones } = await supabase
    .from("delivery_zone")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const { data: ledger } = await supabase
    .from("credit_ledger")
    .select("delta")
    .eq("account_id", accountId);
  const credit = (ledger ?? []).reduce((s, r) => s + r.delta, 0);

  const { data: orders } = await supabase
    .from("b2c_order")
    .select(
      "id, order_type, status, total_amount, delivery_photo_url, created_at, b2c_order_item(id, quantity, unit_price, product_id, product(name))"
    )
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  return (
    <div className="pb-32">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">내 정보</h1>
      </header>

      <main className="px-5">
        <div className="mb-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="" className="h-12 w-12 shrink-0 rounded-full bg-primary-bg p-1.5" />
          <div>
            <p className="text-base font-medium">{account?.name ?? "-"}</p>
            <p className="mt-0.5 text-sm text-neutral-500">
              크레딧 {credit.toLocaleString()}원
            </p>
          </div>
        </div>

        <MyPageTabs
          ordersContent={<OrdersClient orders={(orders as any) ?? []} />}
          profileContent={
            <EditProfileClient
              name={account?.name ?? ""}
              phone={account?.phone ?? ""}
              nickname={account?.nickname ?? ""}
              zones={zones ?? []}
              zoneId={account?.delivery_zone_id ?? ""}
              dong={account?.address_dong ?? ""}
              ho={account?.address_ho ?? ""}
              entrancePassword={
                account?.entrance_password ? decryptSensitive(account.entrance_password) : ""
              }
            />
          }
        />

        <div className="mt-5">
          <LogoutButton />
        </div>
      </main>

      <BottomNav active="/b2c/mypage" />
    </div>
  );
}
