export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAccountId } from "@/lib/getAccount";
import { getConfigs } from "@/lib/settings";
import { getRecentCampaigns, isOpenStatus, statusLabel } from "@/lib/campaign";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import BottomNav from "@/components/BottomNav";

async function getRecentOrders(accountId: string) {
  const { data, error } = await supabase
    .from("b2c_order")
    .select("id, order_type, status, total_amount, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(3);
  if (error || !data) return [];
  return data;
}

export default async function B2CHome() {
  const accountId = await getAccountId("b2c");
  const orders = await getRecentOrders(accountId);
  const notice = await getConfigs(["notice_enabled", "notice_text"]);
  const showNotice = notice.notice_enabled === "true" && notice.notice_text;

  const recentCampaigns = await getRecentCampaigns(7);

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
        <section className="mb-6 space-y-3">
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
                      campaign.photo_url ? "object-cover" : "object-contain p-6 opacity-70"
                    } ${!isOpenStatus(status) ? "blur-sm" : ""}`}
                  />
                  {!isOpenStatus(status) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                        {statusLabel(status)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium">{campaign.title ?? "일반배송 캠페인"}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {isOpenStatus(status)
                      ? `마감 ${new Date(campaign.closes_at).toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul",
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}까지`
                      : "다시 열리면 알려드릴게요"}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <Link
              href="/b2c/order"
              className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 py-4"
            >
              <span className="text-2xl">🛒</span>
              <span className="text-sm">일반배송 주문</span>
            </Link>
          )}
        </section>

        <section>
          <p className="text-sm text-neutral-500 mb-2">최근 주문</p>
          <div className="border-t border-neutral-200">
            {orders.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-400">
                아직 주문 내역이 없어요
              </p>
            ) : (
              orders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between border-b border-neutral-200 py-3"
                >
                  <div>
                    <p className="text-sm">{o.order_type}배송</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {new Date(o.created_at).toLocaleDateString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })}
                    </p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <BottomNav active="/b2c" />
    </div>
  );
}
