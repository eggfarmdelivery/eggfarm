export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { getConfigs } from "@/lib/settings";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  await requireAdmin();
  const config = await getConfigs([
    "bank_name",
    "bank_account",
    "bank_holder",
    "kakao_openchat_url",
    "notice_enabled",
    "notice_text",
  ]);

  return (
    <div className="pb-10">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">운영 설정</h1>
      </header>
      <SettingsClient config={config} />
    </div>
  );
}
