export const dynamic = "force-dynamic";

import Link from "next/link";
import { getConfigs } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import { getSchedule } from "@/lib/schedule";
import {
  computeDeliverySlot,
  computeNextSlot,
  formatKoDate,
  formatTimeLeft,
  WEEKDAY_LABELS,
} from "@/lib/scheduleShared";
import BottomNav from "@/components/BottomNav";
import KakaoShareButton from "@/components/KakaoShareButton";

export default async function B2CHome() {
  const notice = await getConfigs(["notice_enabled", "notice_text"]);
  const showNotice = notice.notice_enabled === "true" && notice.notice_text;

  const schedule = await getSchedule();
  const now = new Date();
  const slot = computeDeliverySlot(now, schedule);
  const nextSlot = computeNextSlot(slot, schedule);

  const { data: products } = await supabase
    .from("product")
    .select("id, name, base_price, photo_url, stock_qty")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  const weekdayText = schedule.weekdays.map((d) => WEEKDAY_LABELS[d]).join(" · ");
  const feeText =
    schedule.freeMinQty > 0
      ? `${schedule.fee.toLocaleString()}원 (${schedule.freeMinQty}판 이상 무료)`
      : `${schedule.fee.toLocaleString()}원`;

  return (
    <div className="pb-32">
      <header className="flex items-center justify-between bg-white px-5 py-4">
        <img src="/logo.png" alt="에그팜" className="h-7 w-auto" />
        <div className="flex items-center gap-3">
          <KakaoShareButton
            title="에그팜 - 신선한 계란 배송"
            description="우리 동네 신선한 계란, 에그팜에서 만나보세요"
            imageUrl="https://eggfarm.vercel.app/icon.png"
            path="/"
            label=""
            className="p-1"
          />
          <button aria-label="알림">🔔</button>
        </div>
      </header>

      {showNotice && (
        <div className="mx-5 mt-3 rounded-lg bg-primary-bg px-3 py-2.5 text-sm text-primary-dark">
          📢 {notice.notice_text}
        </div>
      )}

      <section className="mt-1 bg-primary px-5 py-5 text-white">
        <p className="text-[11px] tracking-wide opacity-80">배송 예정일</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight">
          {formatKoDate(slot.date)} {schedule.start.split(":")[0].replace(/^0/, "")}시 이후
        </p>
        <p className="mt-0.5 text-xs opacity-90">
          주문마감 {formatKoDate(slot.date)} {schedule.cutoff} · {formatTimeLeft(slot.cutoffAt, now)}
        </p>
        <div className="mt-3 border-t border-white/20 pt-2.5 text-xs">
          <div className="flex justify-between py-1">
            <span className="opacity-80">배송 요일</span>
            <b>{weekdayText}</b>
          </div>
          <div className="flex justify-between py-1">
            <span className="opacity-80">마감 이후 주문</span>
            <b>{formatKoDate(nextSlot.date)} 배송</b>
          </div>
        </div>
        <Link
          href="/b2c/order"
          className="mt-3 block rounded-lg bg-white py-3 text-center text-sm font-bold text-primary-dark"
        >
          주문하기
        </Link>
      </section>

      <main className="px-5">
        <h2 className="mb-2 mt-5 text-sm font-bold">지금 주문할 수 있는 상품</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {(products ?? []).map((p) => {
            const stock = Math.max(0, p.stock_qty ?? 0);
            const soldOut = stock <= 0;
            const low = !soldOut && stock <= 5;
            return (
              <Link
                key={p.id}
                href="/b2c/order"
                className="relative block overflow-hidden rounded-xl border border-neutral-200 bg-white"
              >
                <div className="relative aspect-[4/3] w-full bg-neutral-100">
                  {p.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : null}
                  {low && (
                    <span className="absolute left-2 top-2 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {stock}판 남음
                    </span>
                  )}
                  {soldOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-bold text-white">
                      품절
                    </div>
                  )}
                </div>
                <div className="px-3 pb-3 pt-2.5">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-sm font-bold">{p.base_price.toLocaleString()}원</p>
                  <p className={`text-[10px] ${low ? "text-red-500" : "text-neutral-400"}`}>
                    {soldOut ? "입고되면 다시 열려요" : low ? "서두르세요" : "재고 있음"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <h2 className="mb-2 mt-5 text-sm font-bold">배송 안내</h2>
        <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white text-xs">
          <div className="flex justify-between px-4 py-3">
            <span className="text-neutral-400">주문 접수</span>
            <b className="font-medium">매일 00:00 ~ {schedule.cutoff}</b>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-neutral-400">배송 시작</span>
            <b className="font-medium">배송일 {schedule.start}부터 순차</b>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-neutral-400">배송비</span>
            <b className="font-medium">{feeText}</b>
          </div>
        </div>
      </main>

      <BottomNav active="/b2c" />
    </div>
  );
}
