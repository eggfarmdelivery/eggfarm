"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import QuantityStepper from "@/components/QuantityStepper";
import { cancelB2BOrder, updateB2BOrderQuantities, addB2BOrderItem } from "./actions";

type Item = {
  id: string;
  product_id: string;
  quantity: number;
  original_quantity: number | null;
  adjusted: boolean;
  added_later: boolean;
  unit_price: number;
  product: { name: string } | null;
};
type AddableProduct = { productId: string; productName: string; price: number };
type Order = {
  id: string;
  status: string;
  total_amount: number;
  delivery_photo_url: string | null;
  payment_method: string | null;
  desired_delivery_date: string | null;
  cancel_reason: string | null;
  created_at: string;
  b2b_order_item: Item[];
  addableProducts: AddableProduct[];
};

// 배송완료(사진 촬영) 이전 단계로 되돌아가면, 실제 사진 파일은 그대로 서버에 두되 화면엔 안 보이게 함
const PHOTO_VISIBLE_STATUSES = ["입금대기", "입금확인완료", "배송완료"];

function ReasonPromptModal({
  title,
  onClose,
  onConfirm,
  busy,
}: {
  title: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <p className="mb-3 text-base font-medium">{title}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="예: 물량 조정이 필요해서 취소합니다"
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm text-neutral-600"
          >
            돌아가기
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={busy || !reason.trim()}
            className="flex-1 rounded-lg bg-red-500 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "처리 중..." : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderCard({
  order: o,
  bankInfo,
}: {
  order: Order;
  bankInfo: Record<string, string>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [qtys, setQtys] = useState<Record<string, number>>(
    Object.fromEntries(o.b2b_order_item.map((i) => [i.id, i.quantity]))
  );
  const [addingProductId, setAddingProductId] = useState("");
  const [addingQty, setAddingQty] = useState(1);
  const router = useRouter();
  const hasAdjusted = (o.b2b_order_item ?? []).some((i) => i.adjusted);
  const canEdit = ["발주요청", "승인대기"].includes(o.status);
  const showPhoto = PHOTO_VISIBLE_STATUSES.includes(o.status) && o.delivery_photo_url;

  async function handleCancel(reason: string) {
    setBusy(true);
    setError(null);
    const result = await cancelB2BOrder(o.id, reason);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setCancelling(false);
    router.refresh();
  }

  async function handleSaveQuantities() {
    setBusy(true);
    setError(null);
    const items = Object.entries(qtys).map(([itemId, quantity]) => ({ itemId, quantity }));
    const result = await updateB2BOrderQuantities(o.id, items);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleAddItem() {
    if (!addingProductId) return;
    setBusy(true);
    setError(null);
    const result = await addB2BOrderItem(o.id, addingProductId, addingQty);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setAddingProductId("");
    setAddingQty(1);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{o.total_amount.toLocaleString()}원</span>
        <OrderStatusBadge status={o.status} />
      </div>

      {!editing ? (
        <div className="text-xs text-neutral-500 mb-1 space-y-0.5">
          {(o.b2b_order_item ?? []).map((i) => (
            <p key={i.id}>
              {i.adjusted && i.original_quantity != null
                ? `${i.product?.name} ${i.original_quantity}판 → ${i.quantity}판으로 조정됨`
                : `${i.product?.name} ${i.quantity}판`}
              {i.added_later && (
                <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                  추가됨
                </span>
              )}
            </p>
          ))}
        </div>
      ) : (
        <div className="mb-3 space-y-2">
          {o.b2b_order_item.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <span className="text-sm">{item.product?.name}</span>
              <QuantityStepper
                name={`qty_${item.id}`}
                value={qtys[item.id] ?? item.quantity}
                min={1}
                onChange={(v) => setQtys((prev) => ({ ...prev, [item.id]: v }))}
              />
            </div>
          ))}
          <button
            onClick={handleSaveQuantities}
            disabled={busy}
            className="w-full rounded-md bg-primary py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {busy ? "저장 중..." : "수량 저장"}
          </button>

          {o.addableProducts.length > 0 && (
            <div className="mt-3 border-t border-neutral-100 pt-3">
              <p className="mb-1.5 text-xs text-neutral-500">상품 추가</p>
              <div className="flex items-center gap-1.5">
                <select
                  value={addingProductId}
                  onChange={(e) => setAddingProductId(e.target.value)}
                  className="flex-1 rounded-md border border-neutral-200 px-2 py-1.5 text-xs"
                >
                  <option value="">상품 선택</option>
                  {o.addableProducts.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.productName} ({p.price.toLocaleString()}원)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={addingQty}
                  onChange={(e) => setAddingQty(Math.max(1, Number(e.target.value)))}
                  className="w-14 rounded-md border border-neutral-200 px-2 py-1.5 text-center text-xs"
                />
                <button
                  onClick={handleAddItem}
                  disabled={busy || !addingProductId}
                  className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs disabled:opacity-50"
                >
                  담기
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {hasAdjusted && (
        <p className="mb-1 text-xs text-orange-600">재고 사정 등으로 수량이 조정됐어요</p>
      )}
      {o.status === "승인대기" && (
        <p className="mb-1 text-xs text-blue-600">
          마감 이후 접수돼 사장님 승인을 기다리고 있어요. 배송일은 다음 영업일로 자동 배정됐어요.
        </p>
      )}
      {o.status === "취소" && o.cancel_reason && (
        <p className="mb-1 rounded-md bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-500">
          취소 사유: {o.cancel_reason}
        </p>
      )}
      {o.desired_delivery_date && (
        <p className="text-xs text-neutral-400">
          희망 배송일 {new Date(o.desired_delivery_date).toLocaleDateString("ko-KR")}
        </p>
      )}
      <p className="text-xs text-neutral-400">
        {new Date(o.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
      </p>

      {o.status === "입금대기" && bankInfo?.bank_name && (
        <div className="mt-2 rounded-md bg-primary-bg px-3 py-2.5 text-xs text-primary-dark">
          <p className="mb-1 font-medium">입금 안내</p>
          <div className="flex items-center gap-1.5">
            <p>
              {bankInfo.bank_name} {bankInfo.bank_account} ({bankInfo.bank_holder})
            </p>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(bankInfo.bank_account ?? "")}
              className="shrink-0 rounded border border-primary-dark/40 px-1.5 py-0.5 text-[10px]"
            >
              복사
            </button>
          </div>
          <p className="mt-1">입금할 금액 {o.total_amount.toLocaleString()}원</p>
        </div>
      )}

      {showPhoto && (
        <>
          <button
            type="button"
            onClick={() => setPhotoOpen((v) => !v)}
            className="mt-2 text-xs text-primary underline"
          >
            {photoOpen ? "사진 접기" : "배송완료 사진 보기"}
          </button>
          {photoOpen && (
            <img
              src={o.delivery_photo_url!}
              alt="배송완료 사진"
              className="mt-2 rounded-lg w-full object-cover"
            />
          )}
        </>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {canEdit && (
        <div className="mt-3 flex gap-1.5">
          <button
            onClick={() => setEditing((v) => !v)}
            disabled={busy}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 disabled:opacity-50"
          >
            {editing ? "닫기" : "수량 수정 · 상품 추가"}
          </button>
          <button
            onClick={() => setCancelling(true)}
            disabled={busy}
            className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-500 disabled:opacity-50"
          >
            발주 취소
          </button>
        </div>
      )}

      {cancelling && (
        <ReasonPromptModal
          title="이 발주를 취소할까요?"
          busy={busy}
          onClose={() => setCancelling(false)}
          onConfirm={handleCancel}
        />
      )}
    </div>
  );
}
