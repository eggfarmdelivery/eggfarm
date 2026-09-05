export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { getOrCreateDemoAccount } from "@/lib/demoAccount";
import BottomNav from "@/components/BottomNav";
import ZoneSelect from "./ZoneSelect";

export default async function MyPage() {
  const accountId = await getOrCreateDemoAccount("b2c");

  const { data: account } = await supabase
    .from("account")
    .select("name, phone, delivery_zone_id")
    .eq("id", accountId)
    .single();

  const { data: ledger } = await supabase
    .from("credit_ledger")
    .select("delta")
    .eq("account_id", accountId);
  const credit = (ledger ?? []).reduce((s, r) => s + r.delta, 0);

  const { data: zones } = await supabase
    .from("delivery_zone")
    .select("id, name")
    .eq("is_active", true);

  return (
    <div className="pb-20">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">마이페이지</h1>
      </header>

      <main className="px-5 space-y-5">
        <section className="rounded-xl bg-primary-bg p-4">
          <p className="text-xs text-primary-dark mb-1">정기배송 잔여 크레딧</p>
          <p className="text-2xl font-medium text-primary-dark">{credit}회 남음</p>
        </section>

        <section>
          <p className="text-xs text-neutral-500 mb-1">이름</p>
          <p className="text-sm mb-3">{account?.name ?? "-"}</p>
          <p className="text-xs text-neutral-500 mb-1">배송 단지</p>
          <ZoneSelect
            zones={zones ?? []}
            currentZoneId={account?.delivery_zone_id ?? null}
          />
        </section>
      </main>

      <BottomNav active="/b2c/mypage" />
    </div>
  );
}
