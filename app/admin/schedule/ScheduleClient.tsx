"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSchedule } from "./actions";
import Spinner from "@/components/Spinner";
import { WEEKDAY_LABELS, type ScheduleConfig } from "@/lib/scheduleShared";

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // 월~일 순서로 표시

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="text-neutral-600">{label}</span>
      {children}
    </div>
  );
}

const inputCls = "w-24 rounded-lg border border-neutral-300 px-3 py-1.5 text-right text-sm font-medium";

export default function ScheduleClient({ schedule }: { schedule: ScheduleConfig }) {
  const router = useRouter();
  const [days, setDays] = useState<number[]>(schedule.weekdays);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function toggle(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    fd.delete("weekday");
    for (const d of days) fd.append("weekday", String(d));
    const r = await saveSchedule(fd);
    setPending(false);
    if (!r.success) {
      setMessage({ ok: false, text: r.error });
      return;
    }
    setMessage({ ok: true, text: "저장했어요. 다음 주문부터 적용돼요" });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="px-5">
      <h2 className="mb-2 mt-4 flex items-baseline justify-between text-sm font-bold">
        배송 요일 <em className="text-[11px] font-normal not-italic text-neutral-400">눌러서 바꿀 수 있어요</em>
      </h2>
      <div className="flex gap-1.5 rounded-xl border border-neutral-200 bg-white p-3">
        {ORDER.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            className={`h-9 flex-1 rounded-lg border text-xs ${
              days.includes(d)
                ? "border-primary bg-primary font-medium text-white"
                : "border-neutral-300 text-neutral-400"
            }`}
          >
            {WEEKDAY_LABELS[d]}
          </button>
        ))}
      </div>

      <h2 className="mb-2 mt-5 text-sm font-bold">하루 시간표</h2>
      <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
        <Row label="주문 접수 마감">
          <input name="cutoff" defaultValue={schedule.cutoff} placeholder="17:00" className={inputCls} />
        </Row>
        <Row label="배송 시작">
          <input name="start" defaultValue={schedule.start} placeholder="18:00" className={inputCls} />
        </Row>
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-neutral-400">
        주문은 매일 00:00부터 받고, 배송일 마감 시각 이후 주문은 다음 배송일로 넘어가요
      </p>

      <h2 className="mb-2 mt-5 text-sm font-bold">배송비</h2>
      <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
        <Row label="배송비 (원)">
          <input name="fee" defaultValue={schedule.fee} inputMode="numeric" className={inputCls} />
        </Row>
        <Row label="무료배송 기준 (판, 0이면 없음)">
          <input name="free_min" defaultValue={schedule.freeMinQty} inputMode="numeric" className={inputCls} />
        </Row>
      </div>

      <h2 className="mb-2 mt-5 text-sm font-bold">한도 · 알림</h2>
      <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
        <Row label="인당 한도 (배송일당 합계, 0이면 없음)">
          <input name="limit" defaultValue={schedule.perPersonLimit} inputMode="numeric" className={inputCls} />
        </Row>
        <Row label="재고 알림 기준 (판 이하)">
          <input name="threshold" defaultValue={schedule.lowThreshold} inputMode="numeric" className={inputCls} />
        </Row>
      </div>

      {message && (
        <p
          className={`mt-4 rounded-md px-3 py-2 text-sm ${
            message.ok ? "bg-primary-bg text-primary-dark" : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="mt-5">
        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-70"
        >
          {pending && <Spinner className="h-4 w-4" />}
          저장
        </button>
      </div>
    </form>
  );
}
