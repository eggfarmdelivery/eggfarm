"use client";

import { useState } from "react";
import { MapPin, X, MessageCircle } from "lucide-react";
import { submitZoneRequest } from "./zoneRequestActions";
import KakaoShareButton from "@/components/KakaoShareButton";
import Spinner from "@/components/Spinner";

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: { roadAddress: string; jibunAddress: string }) => void;
      }) => { open: () => void };
    };
  }
}

type Step = "form" | "success";

function RequestModal({ onClose }: { onClose: () => void }) {
  const [address, setAddress] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [count, setCount] = useState(0);

  function openAddressSearch() {
    if (!window.daum) {
      alert("주소 검색을 불러오는 중이에요. 잠시 후 다시 시도해주세요");
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        setAddress(data.roadAddress || data.jibunAddress);
      },
    }).open();
  }

  async function handleSubmit() {
    if (!address) {
      setError("주소를 먼저 검색해주세요");
      return;
    }
    setPending(true);
    setError(null);
    const result = await submitZoneRequest(address);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setCount(result.countForAddress);
    setStep("success");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "form" ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900">단지 추가 요청</h2>
              <button onClick={onClose} className="text-neutral-400">
                <X size={18} />
              </button>
            </div>

            <p className="mb-4 rounded-md bg-primary-bg px-3 py-2 text-xs leading-relaxed text-primary-dark">
              현재는 <b>아파트 단지</b>에 한해서만 배송 요청을 받고 있어요. 개별주택·오피스텔 등은 아직 요청이 어려워요.
            </p>

            <p className="mb-1.5 text-xs text-neutral-500">주소 검색 (동/호수는 입력하지 않아요)</p>
            <button
              type="button"
              onClick={openAddressSearch}
              className="mb-3 flex w-full items-center gap-2 rounded-lg border border-neutral-200 px-3 py-3 text-left text-sm text-neutral-400"
            >
              <MapPin size={16} />
              아파트 이름이나 도로명 주소로 검색
            </button>

            {address && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary-bg px-3 py-2.5 text-sm font-medium text-neutral-900">
                <MapPin size={14} className="shrink-0 text-primary-dark" />
                {address}
              </div>
            )}

            {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

            <button
              type="button"
              disabled={pending}
              onClick={handleSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-white disabled:opacity-70"
            >
              {pending && <Spinner />}
              {pending ? "등록 중..." : "요청 등록하기"}
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-bg text-2xl">
              ✅
            </div>
            <div>
              <p className="text-base font-bold text-neutral-900">요청이 등록됐어요!</p>
              <p className="mt-1 text-xs text-neutral-500">
                지금까지 <b className="text-primary">{count}번째</b> 요청이에요
              </p>
            </div>
            <div className="w-full rounded-xl bg-primary-bg px-4 py-3.5">
              <p className="mb-2 text-xs leading-relaxed text-primary-dark">
                이웃에게 알려서 같이 요청하면 더 빨리 열릴 수 있어요 🐣
              </p>
              <KakaoShareButton
                title="우리 동네에도 에그팜이 왔으면 좋겠어요"
                description="같이 단지 추가 요청 넣어주세요!"
                imageUrl={typeof window !== "undefined" ? `${window.location.origin}/logo-mark.png` : ""}
                path="/"
                label="카카오톡으로 공유하기"
                className="w-full justify-center rounded-lg bg-[#FEE500] py-2.5 text-sm font-medium text-[#191600]"
              />
            </div>
            <button onClick={onClose} className="mt-1 text-xs text-neutral-400">
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ZoneRequestSection({ totalCount }: { totalCount: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="w-full rounded-2xl border border-neutral-200 bg-white p-3.5">
        <p className="mb-2 text-xs text-neutral-500">우리 동네 요청 현황</p>
        <p className="mb-3 text-xs leading-relaxed text-neutral-600">
          지금까지 총 <b className="text-primary">{totalCount}건</b>의 단지 추가 요청이 들어왔어요. 요청이 많은
          지역은 오픈을 우선 검토하고 있어요.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-lg border border-primary bg-primary-bg py-2.5 text-sm font-medium text-primary-dark"
        >
          + 우리 단지도 추가 요청하기
        </button>
        <p className="mt-1.5 text-center text-[11px] text-neutral-400">※ 아파트 단지 배송만 요청 가능해요</p>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="단지 추가 요청하기"
        className="fixed bottom-24 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE500] text-[#191600] shadow-lg"
      >
        <MessageCircle size={20} />
      </button>

      {open && <RequestModal onClose={() => setOpen(false)} />}
    </>
  );
}
