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
  stock: number;
};

export default function OrderForm({
  products,
  address,
  bankInfo,
  depositorNickname,
  depositorPhoneSuffix,
  deliveryFee,
  freeShippingMinQty,
  perPersonLimit,
  alreadyQty,
  deliveryDateLabel,
  cutoffLabel,
  startLabel,
  nextDateLabel,
}: {
  products: Product[];
  address: string | null;
  bankInfo: Record<string, string>;
  depositorNickname: string | null;
  depositorPhoneSuffix: string | null;
  deliveryFee: number;
  freeShippingMinQty: number;
  perPersonLimit: number;
  alreadyQty: number;
  deliveryDateLabel: string;
  cutoffLabel: string;
  startLabel: string;
  nextDateLabel: string;
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
  const appliedDeliveryFee = freeShippingMinQty > 0 && totalQty >= freeShippingMinQty ? 0 : deliveryFee;
  const limitLeft = perPersonLimit > 0 ? Math.max(0, perPersonLimit - alreadyQty) : Infinity;
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
    >
      <div className="bg-primary-bg px-5 py-3 text-xs text-primary-dark">
        배송 예정 <b>{deliveryDateLabel} {startLabel} 이후</b> · 주문마감 {cutoffLabel}
      </div>

      <div className="px-5 pb-4">
        <div className="mt-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <p className="text-[11px] text-neutral-400">배송지</p>
          <p className="text-sm">{address ?? "등록된 주소가 없어요 (마이페이지에서 입력해주세요)"}</p>
        </div>

        {products.map((p) => {
          const soldOut = p.stock <= 0;
          const othersQty = totalQty - (qty[p.id] ?? 0);
          const maxByLimit = limitLeft === Infinity ? Infinity : Math.max(0, limitLeft - othersQty);
          const effectiveMax = Math.min(p.stock, maxByLimit);
          const limitMessage =
            effectiveMax === p.stock
              ? `재고가 ${p.stock}판 남았어요`
              : `${deliveryDateLabel} 배송분은 ${perPersonLimit}판까지 주문할 수 있어요`;
          return (
            <div
              key={p.id}
              className={`mt-2.5 flex gap-3 rounded-xl border border-neutral-200 bg-white p-3 ${
                soldOut ? "opacity-60" : ""
              }`}
            >
              <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
                ) : null}
                {soldOut && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white">
                    품절
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-sm font-bold">{p.base_price.toLocaleString()}원</p>
                <div className="mt-auto flex items-end justify-between">
                  <span className={`text-[11px] ${!soldOut && p.stock <= 5 ? "text-red-500" : "text-neutral-400"}`}>
                    {soldOut ? "품절" : p.stock <= 5 ? `${p.stock}판 남음` : "재고 있음"}
                  </span>
                  {!soldOut && (
                    <QuantityStepper
                      name={`qty_${p.id}`}
                      value={qty[p.id] ?? 0}
                      onChange={(v) => setQty((prev) => ({ ...prev, [p.id]: v }))}
                      max={effectiveMax === Infinity ? undefined : effectiveMax}
                      limitMessage={limitMessage}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="mt-3 rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-baseline justify-between px-4 py-2.5 text-sm text-neutral-500">
            <span>상품 금액</span>
            <span>{productTotal.toLocaleString()}원</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-neutral-100 px-4 py-2.5 text-sm text-neutral-500">
            <span>배송비{appliedDeliveryFee === 0 && totalQty > 0 ? ` (${freeShippingMinQty}판 이상 무료)` : ""}</span>
            <span className={appliedDeliveryFee === 0 && totalQty > 0 ? "text-primary" : ""}>
              {appliedDeliveryFee === 0 ? "무료" : `${appliedDeliveryFee.toLocaleString()}원`}
            </span>
          </div>
          <div className="flex items-baseline justify-between border-t border-neutral-100 px-4 py-3">
            <span className="text-sm font-bold">입금할 금액</span>
            <span className="text-xl font-bold text-primary">{total.toLocaleString()}원</span>
          </div>
        </div>

        <p className="mt-3 px-1 text-[11px] leading-relaxed text-neutral-400">
          {perPersonLimit > 0 &&
            `${deliveryDateLabel} 배송분은 1인 최대 ${perPersonLimit}판까지 주문할 수 있어요${
              alreadyQty > 0 ? ` (이미 ${alreadyQty}판 주문하셨어요)` : ""
            }. `}
          {cutoffLabel} 이후 주문은 {nextDateLabel}에 배송돼요.
        </p>
      </div>

      <div className="px-5">
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

      </div>

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
