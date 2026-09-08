"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { openCampaign, closeCampaignEarly } from "./actions";
import Spinner from "@/components/Spinner";
import type { Campaign, CampaignStatus } from "@/lib/campaign";
import { statusLabel } from "@/lib/campaign";

const STATUS_TEXT: Record<CampaignStatus, string> = {
  none: "아직 캠페인을 연 적이 없어요",
  open: "지금 주문 받는 중이에요",
  closed_deadline: "마감시각이 지나 주문마감됐어요",
  closed_early_manual: "관리자가 조기마감했어요",
  closed_early_stock: "재고소진으로 조기마감됐어요",
};

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function CampaignClient({
  campaign,
  status,
}: {
  campaign: Campaign | null;
  status: CampaignStatus;
}) {
  const [closesAt, setClosesAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 24, 0, 0, 0);
    return toLocalInputValue(d);
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isOpen = status === "open";

  async function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setPending(true);
    setError(null);
    const result = await fn();
    setPending(false);
    if (!result.success) {
      setError(result.error ?? "처리 중 오류가 발생했어요");
      return;
    }
    router.refresh();
  }

  return (
    <div className="px-5">
      <div className="mb-4 rounded-xl bg-neutral-50 p-4">
        <p className="text-xs text-neutral-500 mb-1">현재 상태</p>
        <p className="text-base font-medium mb-1">
          {isOpen ? "오픈중" : status === "none" ? "미오픈" : statusLabel(status)}
        </p>
        <p className="text-xs text-neutral-500">{STATUS_TEXT[status]}</p>
        {campaign && (
          <p className="mt-2 text-xs text-neutral-400">
            마감 예정: {new Date(campaign.closes_at).toLocaleString("ko-KR")}
          </p>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {isOpen ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => closeCampaignEarly(campaign!.id))}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          지금 조기마감하기
        </button>
      ) : (
        <div>
          <label className="mb-1 block text-xs text-neutral-500">새 캠페인 마감 일시</label>
          <input
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            className="mb-3 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => openCampaign(closesAt))}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending && <Spinner />}
            캠페인 오픈하기
          </button>
        </div>
      )}
    </div>
  );
}
