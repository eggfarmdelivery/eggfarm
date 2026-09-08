"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { openCampaign, updateCampaign, closeCampaignEarly, deleteCampaign } from "./actions";
import Spinner from "@/components/Spinner";
import type { Campaign, CampaignProductLimit, CampaignStatus } from "@/lib/campaign";
import { statusLabel } from "@/lib/campaign";

type Product = { id: string; name: string; base_price: number };
type CampaignInfo = {
  campaign: Campaign;
  productLimits: CampaignProductLimit[];
  status: CampaignStatus;
};

const STATUS_STYLE: Record<CampaignStatus, string> = {
  not_yet_open: "text-neutral-500",
  open: "text-primary",
  closed_deadline: "text-neutral-400",
  closed_early_manual: "text-red-500",
  closed_early_stock: "text-red-500",
};

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function toDateInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type ProductLimitState = { selected: boolean; stockLimit: string; perPersonLimit: string };

function CampaignForm({
  products,
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  products: Product[];
  initial?: {
    title: string;
    opensAt: string;
    closesAt: string;
    deliveryDate: string;
    limitsByProduct: Record<string, { stockLimit: number; perPersonLimit: number | null }>;
  };
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [opensAt, setOpensAt] = useState(initial?.opensAt ?? toLocalInputValue(new Date()));
  const [closesAt, setClosesAt] = useState(
    initial?.closesAt ??
      (() => {
        const d = new Date();
        d.setHours(d.getHours() + 24, 0, 0, 0);
        return toLocalInputValue(d);
      })()
  );
  const [deliveryDate, setDeliveryDate] = useState(
    initial?.deliveryDate ??
      (() => {
        const d = new Date();
        d.setDate(d.getDate() + 2);
        return toDateInputValue(d);
      })()
  );
  const [productState, setProductState] = useState<Record<string, ProductLimitState>>(() => {
    const state: Record<string, ProductLimitState> = {};
    for (const p of products) {
      const existing = initial?.limitsByProduct[p.id];
      state[p.id] = {
        selected: !!existing || !initial,
        stockLimit: existing ? String(existing.stockLimit) : "",
        perPersonLimit: existing?.perPersonLimit ? String(existing.perPersonLimit) : "",
      };
    }
    return state;
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  function updateProduct(id: string, patch: Partial<ProductLimitState>) {
    setProductState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSuccess(false);
    formData.set("title", title);
    // 브라우저 로컬시각을 여기서 ISO(UTC)로 변환해 보냄 - 서버가 자기 타임존(UTC)으로
    // 잘못 재해석해 시각이 밀리는 문제 방지
    formData.set("opens_at", new Date(opensAt).toISOString());
    formData.set("closes_at", new Date(closesAt).toISOString());
    formData.set("delivery_date", deliveryDate);
    for (const p of products) {
      const state = productState[p.id];
      if (!state?.selected) continue;
      formData.append("product_ids", p.id);
      formData.set(`stock_limit_${p.id}`, state.stockLimit);
      formData.set(`per_person_limit_${p.id}`, state.perPersonLimit);
    }
    const result = await onSubmit(formData);
    setPending(false);
    if (!result.success) {
      setError(result.error ?? "처리 중 오류가 발생했어요");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-3">
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
          캠페인 사진 <span className="text-neutral-400">(선택, 안 넣으면 기존/기본이미지 유지)</span>
        </label>
        <input
          type="file"
          name="photo"
          accept="image/*"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
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
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">배송 예정일</label>
        <input
          type="date"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">
          포함할 품목 (품목마다 재고상한·1인당 제한을 따로 정해요)
        </label>
        {products.length === 0 ? (
          <p className="text-xs text-neutral-400">등록된 상품이 없어요</p>
        ) : (
          <div className="space-y-2">
            {products.map((p) => {
              const state = productState[p.id];
              return (
                <div
                  key={p.id}
                  className={`rounded-lg border p-3 ${
                    state?.selected ? "border-neutral-300" : "border-neutral-200 opacity-60"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={state?.selected ?? false}
                        onChange={(e) => updateProduct(p.id, { selected: e.target.checked })}
                        className="h-4 w-4"
                      />
                      {p.name}
                    </label>
                    <span className="text-xs text-neutral-400">
                      {p.base_price.toLocaleString()}원/판
                    </span>
                  </div>
                  {state?.selected && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-0.5 block text-[11px] text-neutral-400">
                          재고상한
                        </label>
                        <input
                          value={state.stockLimit}
                          onChange={(e) =>
                            updateProduct(p.id, {
                              stockLimit: e.target.value.replace(/\D/g, ""),
                            })
                          }
                          inputMode="numeric"
                          placeholder="예: 30"
                          className="w-full rounded-lg border border-neutral-200 px-2.5 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[11px] text-neutral-400">
                          1인당 제한 <span className="text-neutral-300">(선택)</span>
                        </label>
                        <input
                          value={state.perPersonLimit}
                          onChange={(e) =>
                            updateProduct(p.id, {
                              perPersonLimit: e.target.value.replace(/\D/g, ""),
                            })
                          }
                          inputMode="numeric"
                          placeholder="예: 3"
                          className="w-full rounded-lg border border-neutral-200 px-2.5 py-2 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">저장됐어요</p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex-1 rounded-lg border border-neutral-300 py-3 text-sm"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          {pending ? "처리 중..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function CampaignClient({
  campaigns,
  products,
}: {
  campaigns: CampaignInfo[];
  products: Product[];
}) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [closingError, setClosingError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCloseEarly(campaignId: string) {
    setClosingError(null);
    const result = await closeCampaignEarly(campaignId);
    if (!result.success) {
      setClosingError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDelete(campaignId: string) {
    if (!confirm("이 캠페인을 삭제할까요? 되돌릴 수 없어요")) return;
    setClosingError(null);
    const result = await deleteCampaign(campaignId);
    if (!result.success) {
      setClosingError(result.error);
      return;
    }
    router.refresh();
  }

  const editingInfo = campaigns.find((c) => c.campaign.id === editingId);

  return (
    <div className="px-5">
      {closingError && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {closingError}
        </p>
      )}

      {editingInfo ? (
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium">캠페인 수정</p>
          <CampaignForm
            products={products}
            initial={{
              title: editingInfo.campaign.title ?? "",
              opensAt: toLocalInputValue(new Date(editingInfo.campaign.opens_at)),
              closesAt: toLocalInputValue(new Date(editingInfo.campaign.closes_at)),
              deliveryDate: editingInfo.campaign.delivery_date
                ? editingInfo.campaign.delivery_date
                : toDateInputValue(new Date()),
              limitsByProduct: Object.fromEntries(
                editingInfo.productLimits.map((l) => [
                  l.product_id,
                  { stockLimit: l.stock_limit, perPersonLimit: l.per_person_limit },
                ])
              ),
            }}
            onSubmit={(formData) => updateCampaign(editingInfo.campaign.id, formData)}
            onCancel={() => setEditingId(null)}
            submitLabel="수정 저장"
          />
        </div>
      ) : creating ? (
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium">새 캠페인</p>
          <CampaignForm
            products={products}
            onSubmit={openCampaign}
            onCancel={() => setCreating(false)}
            submitLabel="캠페인 오픈하기"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-white"
        >
          + 새 캠페인 만들기
        </button>
      )}

      <p className="mb-2 text-xs text-neutral-500">캠페인 목록 (여러 개 동시 운영 가능)</p>
      <div className="space-y-2">
        {campaigns.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-400">
            아직 캠페인을 연 적이 없어요
          </p>
        )}
        {campaigns.map(({ campaign, status }) => (
          <div key={campaign.id} className="rounded-lg border border-neutral-200 p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-medium">{campaign.title ?? "제목 없음"}</p>
              <span className={`text-xs font-medium ${STATUS_STYLE[status]}`}>
                {status === "open" ? "오픈중" : statusLabel(status)}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              오픈 {new Date(campaign.opens_at).toLocaleString("ko-KR")} · 마감{" "}
              {new Date(campaign.closes_at).toLocaleString("ko-KR")}
            </p>
            {campaign.delivery_date && (
              <p className="text-xs text-neutral-400">
                배송예정일 {new Date(campaign.delivery_date).toLocaleDateString("ko-KR")}
              </p>
            )}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingId(campaign.id);
                  setCreating(false);
                }}
                className="flex-1 rounded-md border border-neutral-300 py-1.5 text-xs"
              >
                수정
              </button>
              {status === "open" && (
                <button
                  type="button"
                  onClick={() => handleCloseEarly(campaign.id)}
                  className="flex-1 rounded-md border border-red-300 py-1.5 text-xs text-red-500"
                >
                  조기마감
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(campaign.id)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-500"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
