export const dynamic = "force-dynamic";

import { requireOwner } from "@/lib/adminAuth";
import { getConfigs } from "@/lib/settings";
import { isAdminKakaoConnected } from "@/lib/kakao";
import SettingsClient from "./SettingsClient";
import TestAccountReset from "./TestAccountReset";
import KakaoNotifySection from "./KakaoNotifySection";
import AdminLogoutButton from "./AdminLogoutButton";
import StaffManagement from "./StaffManagement";
import { SettingGroup, SettingRow } from "./SettingRow";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ kakao_connected?: string; kakao_error?: string }>;
}) {
  await requireOwner();
  const { kakao_connected, kakao_error } = await searchParams;
  const config = await getConfigs([
    "bank_name",
    "bank_account",
    "bank_holder",
    "kakao_openchat_url",
    "notice_enabled",
    "notice_text",
    "low_stock_alert_threshold",
    "b2b_min_order_qty",
    "b2b_origin_address",
    "b2b_order_deadline",
    "b2b_closed_days",
  ]);
  const connected = await isAdminKakaoConnected();

  return (
    <div className="min-h-screen bg-white pb-28 text-neutral-900">
      <header className="px-5 pb-3 pt-5">
        <h1 className="text-[22px] font-bold tracking-tight">환경설정</h1>
      </header>
      <div className="flex flex-col gap-5 px-5">
        <SettingsClient config={config} />

        <SettingGroup title="알림">
          <SettingRow
            label="카카오 알림"
            defaultOpen={kakao_connected === "1" || !!kakao_error}
            badge={connected ? { text: "연동됨", tone: "green" } : { text: "연동 안 됨", tone: "orange" }}
          >
            <KakaoNotifySection connected={connected} justConnected={kakao_connected === "1"} error={kakao_error} />
          </SettingRow>
        </SettingGroup>

        <SettingGroup title="관리">
          <SettingRow label="직원 관리" value="입금확인·배송 담당자 권한">
            <StaffManagement />
          </SettingRow>
          <SettingRow label="테스트 계정 관리">
            <TestAccountReset />
          </SettingRow>
        </SettingGroup>

        <div className="mt-2">
          <AdminLogoutButton />
        </div>
      </div>
    </div>
  );
}
