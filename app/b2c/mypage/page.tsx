export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { decryptSensitive } from "@/lib/crypto";
import BottomNav from "@/components/BottomNav";
import EditProfileClient from "./EditProfileClient";
import LogoutButton from "./LogoutButton";
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

      <main className="px-5 space-y-5">
        <section className="rounded-xl bg-primary-bg p-4">
          <p className="text-xs text-primary-dark mb-1">크레딧</p>
          <p className="text-2xl font-medium text-primary-dark">{credit.toLocaleString()}원</p>
        </section>

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

        <section>
          <p className="mb-2 text-sm font-medium">주문내역</p>
          <OrdersClient orders={(orders as any) ?? []} />
        </section>

        <LogoutButton />
      </main>

      <BottomNav active="/b2c/mypage" />
    </div>
  );
}
