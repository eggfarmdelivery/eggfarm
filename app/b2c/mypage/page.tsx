export const dynamic = "force-dynamic";

import Link from "next/link";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { maskPhone } from "@/lib/mask";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "./LogoutButton";

export default async function MyPage() {
  const accountId = await getAccountId("b2c");
  const sessionSupabase = await createClient();

  const { data: account } = await sessionSupabase
    .from("account")
    .select("phone, nickname, delivery_zone_id")
    .eq("id", accountId)
    .single();

  const { data: zone } = account?.delivery_zone_id
    ? await supabase
        .from("delivery_zone")
        .select("name")
        .eq("id", account.delivery_zone_id)
        .single()
    : { data: null };

  return (
    <div className="pb-32">
      <header className="flex items-center justify-between px-5 py-4">
        <h1 className="text-base font-medium">내 정보</h1>
        <Link href="/b2c/mypage/edit" aria-label="회원정보 수정" className="p-1.5 text-neutral-500">
          <Settings size={20} />
        </Link>
      </header>

      <main className="px-5">
        <div className="mb-6 rounded-xl border border-neutral-200 p-4 text-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 py-2 first:pt-0">
            <span className="text-neutral-500">닉네임</span>
            <span>{account?.nickname ?? "-"}</span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 py-2">
            <span className="text-neutral-500">등록 아파트</span>
            <span>{zone?.name ?? "-"}</span>
          </div>
          <div className="flex items-center justify-between py-2 last:pb-0">
            <span className="text-neutral-500">전화번호</span>
            <span>{account?.phone ? maskPhone(account.phone) : "-"}</span>
          </div>
        </div>

        <p className="mb-4 text-xs text-neutral-400">
          상세 정보 확인·수정은 우측 상단 톱니바퀴를 눌러주세요
        </p>

        <LogoutButton />
      </main>

      <BottomNav active="/b2c/mypage" />
    </div>
  );
}
