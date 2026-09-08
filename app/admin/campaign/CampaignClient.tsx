"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { openCampaign, closeCampaignEarly } from "./actions";
import Spinner from "@/components/Spinner";
import type { Campaign, CampaignStatus } from "@/lib/campaign";
import { statusLabel } from "@/lib/campaign";

type Product = { id: string; name: string };

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
  products,
  campaignProductIds,
}: {
  campaign: Campaign | null;
  status: CampaignStatus;
  products: Product[];
  campaignProductIds: string[];
}) {
  const [title, setTitle] = useState("");
  const [opensAt, setOpensAt] = useState(() => toLocalInputValue(new Date()));
  const [closesAt, setClosesAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 24, 0, 0, 0);
    return toLocalInputValue(d);
  });
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    products.map((p) => p.id)
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isOpen = status === "open";
  const isClosedButExists = campaign && !isOpen && status !== "none";

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleOpen(formData: FormData) {
    setPending(true);
    setError(null);
    formData.set("title", title);
    formData.set("opens_at", opensAt);
    formData.set("closes_at", closesAt);
    selectedProductIds.forEach((id) => formData.append("product_ids", id));
    const result = await openCampaign(formData);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleCloseEarly() {
    if (!campaign) return;
    setPending(true);
    setError(null);
    const result = await closeCampaignEarly(campaign.id);
    setPending(false);
    if (!result.success) {
      setError(result.error);
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
        {campaign && (isOpen || isClosedButExists) && (
          <div className="mt-2 space-y-0.5 text-xs text-neutral-400">
            {campaign.title && <p>제목: {campaign.title}</p>}
            <p>오픈: {new Date(campaign.opens_at).toLocaleString("ko-KR")}</p>
            <p>마감 예정: {new Date(campaign.closes_at).toLocaleString("ko-KR")}</p>
          </div>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {isOpen ? (
        <button
          type="button"
          disabled={pending}
          onClick={handleCloseEarly}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          지금 조기마감하기
        </button>
      ) : (
        <form action={handleOpen} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">캠페인 제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 9월 2주차 계란 주문받아요"
              required
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-500">
              캠페인 사진 <span className="text-neutral-400">(선택)</span>
            </label>
            <input
              type="file"
              name="photo"
              accept="image/*"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-500">오픈 일시</label>
            <input
              type="datetime-local"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-500">마감 일시</label>
            <input
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-500">포함할 품목</label>
            {products.length === 0 ? (
              <p className="text-xs text-neutral-400">등록된 상품이 없어요</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProduct(p.id)}
                    className={`rounded-lg border py-2 text-sm ${
                      selectedProductIds.includes(p.id)
                        ? "border-primary bg-primary-bg text-primary"
                        : "border-neutral-200 text-neutral-600"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending && <Spinner />}
            캠페인 오픈하기
          </button>
        </form>
      )}
    </div>
  );
}
