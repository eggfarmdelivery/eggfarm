export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { decryptSensitive } from "@/lib/crypto";
import EditProfileClient from "../EditProfileClient";

export default async function EditMyPage() {
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

  return (
    <div className="pb-10">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/b2c/mypage" aria-label="뒤로가기">
          ←
        </Link>
        <h1 className="text-base font-medium">회원정보 수정</h1>
      </header>

      <main className="px-5">
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
      </main>
    </div>
  );
}
