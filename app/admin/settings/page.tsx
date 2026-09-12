export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { getConfigs } from "@/lib/settings";
import { isAdminKakaoConnected } from "@/lib/kakao";
import SettingsClient from "./SettingsClient";
import TestAccountReset from "./TestAccountReset";
import KakaoNotifySection from "./KakaoNotifySection";
import AdminLogoutButton from "./AdminLogoutButton";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ kakao_connected?: string; kakao_error?: string }>;
}) {
  await requireAdmin();
  const { kakao_connected, kakao_error } = await searchParams;
  const config = await getConfigs([
    "bank_name",
    "bank_account",
    "bank_holder",
    "kakao_openchat_url",
    "notice_enabled",
    "notice_text",
    "b2b_min_order_amount",
    "b2b_origin_address",
    "daily_order_deadline",
  ]);
  const connected = await isAdminKakaoConnected();

  return (
    <div className="pb-24">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">운영 설정</h1>
      </header>
      <SettingsClient config={config} />
      <div className="px-5">
        <KakaoNotifySection
          connected={connected}
          justConnected={kakao_connected === "1"}
          error={kakao_error}
        />
        <TestAccountReset />
        <div className="mt-6">
          <AdminLogoutButton />
        </div>
      </div>
    </div>
  );
}
