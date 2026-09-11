"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { createGeneralOrder } from "./actions";
import Spinner from "@/components/Spinner";
import QuantityStepper from "@/components/QuantityStepper";
import PaymentInfoModal, { type BankInfo } from "@/components/PaymentInfoModal";

type Product = {
  id: string;
  name: string;
  base_price: number;
  photo_url: string | null;
  soldOut: boolean;
  perPersonLimit: number | null;
  remainingStock: number | null;
};

export default function OrderForm({
  campaignId,
  products,
  address,
  bankInfo,
  depositorNickname,
  depositorPhoneSuffix,
  deliveryFee,
  freeShippingMinQty,
}: {
  campaignId: string;
  products: Product[];
  address: string | null;
  bankInfo: Record<string, string>;
  depositorNickname: string | null;
  depositorPhoneSuffix: string | null;
  deliveryFee: number;
  freeShippingMinQty: number;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [paidTotal, setPaidTotal] = useState<number | null>(null);
  const [justSucceeded, setJustSucceeded] = useState(false);
  const [pressed, setPressed] = useState(false);
  const submittingRef = useRef(false);
  const router = useRouter();

  const totalQty = Object.values(qty).reduce((s, v) => s + v, 0);
  const productTotal = products.reduce(
    (sum, p) => sum + (qty[p.id] ?? 0) * p.base_price,
    0
  );
  const appliedDeliveryFee = totalQty >= freeShippingMinQty ? 0 : deliveryFee;
  const total = productTotal + appliedDeliveryFee;

  async function handleSubmit(formData: FormData) {
    // state는 리액트 렌더링을 거쳐야 반영되어 빠른 연속 탭(더블탭)에서는 둘 다 통과할 수 있음 -
    // ref는 즉시(동기적으로) 갱신되므로 이걸로 확실하게 중복 제출을 막음
    if (submittingRef.current) return;
    submittingRef.current = true;
    // <form action={fn}> 방식은 내부적으로 트랜지션으로 처리돼서, 처리중 상태(pending) 렌더링이
    // 화면에 그려지기도 전에 응답이 와버리면 "주문접수중" 카드가 안 보이고 그냥 넘어가는 문제가 있었음.
    // flushSync로 강제로 즉시 렌더링해서 오버레이가 반드시 먼저 그려지도록 함
    flushSync(() => {
      setError(null);
      setPending(true);
    });
    const startedAt = Date.now();
    try {
      formData.set("campaign_id", campaignId);
      formData.set("delivery_fee_charged", String(appliedDeliveryFee));
      const result = await createGeneralOrder(formData);

      // 응답이 너무 빨리 오면 "눌렸다"는 느낌 자체가 안 들 수 있어서, 최소 900ms는
      // 처리중 상태를 눈에 확실히 보이게 유지함
      const elapsed = Date.now() - startedAt;
      if (elapsed < 900) {
        await new Promise((resolve) => setTimeout(resolve, 900 - elapsed));
      }

      if (!result.success) {
        setError(result.error);
        setPending(false);
        submittingRef.current = false;
        return;
      }
      // 성공 시 짧게 "접수완료" 표시를 보여준 뒤 입금안내 팝업을 열어서, 눌림→처리→완료 흐름이 확실히 느껴지게 함
      setJustSucceeded(true);
      await new Promise((resolve) => setTimeout(resolve, 400));
      setPaidTotal(result.remainingAmount);
    } catch {
      setError("주문 처리 중 알 수 없는 오류가 발생했어요");
      setPending(false);
      submittingRef.current = false;
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="px-5"
    >
      <p className="text-xs text-neutral-500 mb-1">배송 주소</p>
      <div className="mb-4 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-600">
        {address ?? "등록된 주소가 없어요 (마이페이지에서 입력해주세요)"}
      </div>

      <p className="text-xs text-neutral-500 mb-1">상품 선택</p>
      <div className="border-t border-neutral-200 mb-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between border-b border-neutral-200 py-3 gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              {p.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.photo_url}
                  alt={p.name}
                  className="h-12 w-12 shrink-0 rounded-md object-cover bg-neutral-100"
                />
              ) : (
                <div className="h-12 w-12 shrink-0 rounded-md bg-neutral-100" />
              )}
              <div className="min-w-0">
                <p className="text-sm truncate">
                  {p.name}
                  {p.soldOut && (
                    <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                      품절
                    </span>
                  )}
                </p>
                <p className="text-xs text-neutral-400">
                  {p.base_price.toLocaleString()}원/판
                  {!p.soldOut && p.remainingStock !== null && (
                    <span className="ml-1.5 text-neutral-400">
                      · 잔여 {p.remainingStock.toLocaleString()}판
                    </span>
                  )}
                </p>
              </div>
            </div>
            {p.soldOut ? (
              <span className="shrink-0 text-xs text-neutral-400">주문 불가</span>
            ) : (
              (() => {
                const caps = [p.perPersonLimit, p.remainingStock].filter(
                  (v): v is number => v !== null
                );
                const effectiveMax = caps.length ? Math.min(...caps) : undefined;
                const limitMessage =
                  effectiveMax !== undefined &&
                  p.remainingStock !== null &&
                  effectiveMax === p.remainingStock
                    ? `재고가 ${p.remainingStock}판 남았어요`
                    : p.perPersonLimit
                      ? `1인당 최대 ${p.perPersonLimit}판까지예요`
                      : undefined;
                return (
                  <QuantityStepper
                    name={`qty_${p.id}`}
                    value={qty[p.id] ?? 0}
                    onChange={(v) => setQty((prev) => ({ ...prev, [p.id]: v }))}
                    max={effectiveMax}
                    limitMessage={limitMessage}
                  />
                );
              })()
            )}
          </div>
        ))}
      </div>

      <div className="mb-4 space-y-1 rounded-lg bg-neutral-50 p-3">
        <div className="flex items-baseline justify-between text-sm text-neutral-500">
          <span>상품 금액</span>
          <span>{productTotal.toLocaleString()}원</span>
        </div>
        <div className="flex items-baseline justify-between text-sm text-neutral-500">
          <span>배송비{appliedDeliveryFee === 0 && totalQty > 0 ? ` (${freeShippingMinQty}판 이상 무료)` : ""}</span>
          <span>{appliedDeliveryFee === 0 ? "무료" : `${appliedDeliveryFee.toLocaleString()}원`}</span>
        </div>
        <div className="flex items-baseline justify-between border-t border-neutral-200 pt-1.5">
          <span className="text-sm font-medium text-neutral-700">입금할 금액</span>
          <span className="text-xl font-semibold text-red-500">{total.toLocaleString()}원</span>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || total === 0}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        onTouchCancel={() => setPressed(false)}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-medium text-white transition-transform duration-100 disabled:opacity-70 ${
          pressed ? "scale-[0.96]" : "scale-100"
        } ${justSucceeded ? "bg-green-600" : pending ? "bg-primary-dark" : "bg-primary"}`}
      >
        {pending && <Spinner className="h-5 w-5" />}
        {justSucceeded ? "접수완료!" : pending ? "주문 접수 중이에요..." : "주문하기"}
      </button>

      {pending && !justSucceeded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-7 shadow-lg">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium text-neutral-700">주문 접수 중이에요...</p>
          </div>
        </div>
      )}

      {paidTotal !== null && (
        <PaymentInfoModal
          bankInfo={bankInfo as BankInfo}
          amount={paidTotal}
          depositorNickname={depositorNickname}
          depositorPhoneSuffix={depositorPhoneSuffix}
          onClose={() => router.push("/b2c/orders")}
        />
      )}
    </form>
  );
}
