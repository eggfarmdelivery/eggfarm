export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/getAccount";
import { decryptSensitive } from "@/lib/crypto";
import BottomNav from "@/components/BottomNav";
import EditProfileClient from "./EditProfileClient";
import LogoutButton from "./LogoutButton";

export default async function MyPage() {
  const accountId = await getAccountId("b2c");
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("account")
    .select("name, phone, nickname, base_address, address_dong, address_ho, entrance_password")
    .eq("id", accountId)
    .single();

  const { data: ledger } = await supabase
    .from("credit_ledger")
    .select("delta")
    .eq("account_id", accountId);
  const credit = (ledger ?? []).reduce((s, r) => s + r.delta, 0);

  return (
    <div className="pb-32">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">마이페이지</h1>
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
          baseAddress={account?.base_address ?? ""}
          dong={account?.address_dong ?? ""}
          ho={account?.address_ho ?? ""}
          entrancePassword={
            account?.entrance_password ? decryptSensitive(account.entrance_password) : ""
          }
        />

        <LogoutButton />
      </main>

      <BottomNav active="/b2c/mypage" />
    </div>
  );
}
