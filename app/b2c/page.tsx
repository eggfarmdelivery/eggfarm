export const dynamic = "force-dynamic";

import Link from "next/link";
import { getConfigs } from "@/lib/settings";
import { getRecentCampaigns, isOpenStatus, statusLabel } from "@/lib/campaign";
import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import BottomNav from "@/components/BottomNav";

function formatTimeLeft(closesAt: string): string {
  const diffMs = new Date(closesAt).getTime() - Date.now();
  if (diffMs <= 0) return "곧 마감";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `마감 ${days}일 ${hours % 24}시간 남음`;
  }
  return `마감 ${hours}시간 ${minutes}분 남음`;
}

export default async function B2CHome() {
  const accountId = await getAccountId("b2c");
  const { data: account } = await supabase
    .from("account")
    .select("delivery_zone_id")
    .eq("id", accountId)
    .single();

  const notice = await getConfigs(["notice_enabled", "notice_text"]);
  const showNotice = notice.notice_enabled === "true" && notice.notice_text;

  const recentCampaigns = await getRecentCampaigns(7, account?.delivery_zone_id ?? null);

  return (
    <div className="pb-32">
      <header className="flex items-center justify-between px-5 py-4">
        <img src="/logo.png" alt="에그팜" className="h-7 w-auto" />
        <button aria-label="알림">🔔</button>
      </header>

      {showNotice && (
        <div className="mx-5 mb-4 rounded-lg bg-primary-bg px-3 py-2.5 text-sm text-primary-dark">
          📢 {notice.notice_text}
        </div>
      )}

      <main className="px-5">
        <section className="mb-6 grid grid-cols-2 gap-3">
          {recentCampaigns.length > 0 ? (
            recentCampaigns.map(({ campaign, status }) => (
              <Link
                key={campaign.id}
                href={`/b2c/order?campaign=${campaign.id}`}
                className="block overflow-hidden rounded-xl border border-neutral-200"
              >
                <div className="relative h-32 w-full bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={campaign.photo_url ?? "/icon.png"}
                    alt={campaign.title ?? "캠페인"}
                    className={`h-full w-full ${
                      campaign.photo_url ? "object-cover" : "object-contain p-4 opacity-70"
                    } ${!isOpenStatus(status) ? "blur-sm" : ""}`}
                  />
                  {!isOpenStatus(status) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                        {statusLabel(status)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="truncate text-xs font-medium">
                    {campaign.title ?? "일반배송 캠페인"}
                  </p>
                  {campaign.delivery_date && (
                    <p className="mt-0.5 text-[10px] text-neutral-400">
                      배송{" "}
                      {new Date(campaign.delivery_date).toLocaleDateString("ko-KR", {
                        timeZone: "Asia/Seoul",
                        month: "numeric",
                        day: "numeric",
                        weekday: "short",
                      })}
                    </p>
                  )}
                  {isOpenStatus(status) ? (
                    <>
                      <p className="mt-0.5 text-[10px] text-red-500">
                        {formatTimeLeft(campaign.closes_at)}
                      </p>
                      <div className="mt-1.5 rounded-md bg-primary py-1.5 text-center text-[11px] font-medium text-white">
                        주문하기
                      </div>
                    </>
                  ) : (
                    <p className="mt-0.5 text-[10px] text-neutral-400">다시 열리면 알려드릴게요</p>
                  )}
                </div>
              </Link>
            ))
          ) : (
            <Link
              href="/b2c/order"
              className="col-span-2 flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 py-4"
            >
              <span className="text-2xl">🛒</span>
              <span className="text-sm">일반배송 주문</span>
            </Link>
          )}
        </section>
      </main>

      <BottomNav active="/b2c" />
    </div>
  );
}
