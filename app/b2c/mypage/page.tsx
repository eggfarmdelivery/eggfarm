export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/getAccount";
import { decryptSensitive } from "@/lib/crypto";
import BottomNav from "@/components/BottomNav";
import ZoneSelect from "./ZoneSelect";
import LogoutButton from "./LogoutButton";

export default async function MyPage() {
  const accountId = await getAccountId("b2c");
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("account")
    .select("name, phone, address, entrance_password, delivery_zone_id")
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
          <p className="text-2xl font-medium text-primary-dark">{credit.toLocaleString()}원</p>
        </section>

        <section>
          <p className="text-xs text-neutral-500 mb-1">이름</p>
          <p className="text-sm mb-3">{account?.name ?? "-"}</p>
          <p className="text-xs text-neutral-500 mb-1">전화번호</p>
          <p className="text-sm mb-3">{account?.phone ?? "-"}</p>
          <p className="text-xs text-neutral-500 mb-1">배송 단지</p>
          <ZoneSelect
            zones={zones ?? []}
            currentZoneId={account?.delivery_zone_id ?? null}
          />
          <p className="text-xs text-neutral-500 mb-1 mt-3">상세주소</p>
          <p className="text-sm mb-3">{account?.address ?? "-"}</p>
          <p className="text-xs text-neutral-500 mb-1">공동현관 비밀번호</p>
          <p className="text-sm mb-3">
            {account?.entrance_password
              ? decryptSensitive(account.entrance_password)
              : "미등록"}
          </p>
        </section>

        <LogoutButton />
      </main>

      <BottomNav active="/b2c/mypage" />
    </div>
  );
}
