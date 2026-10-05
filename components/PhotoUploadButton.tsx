"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import { addTimestampWatermark } from "@/lib/watermark";
import CameraCaptureModal from "@/components/CameraCaptureModal";

export default function PhotoUploadButton({
  orderId,
  label,
  confirmAddress,
  confirmItemsSummary,
  watermarkLines,
  alsoOrderIds,
  onSubmit,
}: {
  orderId: string;
  label: string;
  confirmAddress?: string | null;
  confirmItemsSummary?: string;
  /** 촬영 화면과 사진 가운데에 함께 표시할 배송정보(예: ["101동 203호", "특란 2판"]) */
  watermarkLines?: string[];
  /** 같은 집의 다른 주문 번호들 - 한 번 촬영으로 함께 배송완료 처리 */
  alsoOrderIds?: string[];
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}) {
  const [pending, setPending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function processFile(file: File) {
    setPending(true);
    try {
      const watermarked = await addTimestampWatermark(file);
      setPendingFile(watermarked);
      setPreviewUrl(URL.createObjectURL(watermarked));
    } catch {
      alert("사진 처리 중 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  function openCamera() {
    const supported =
      typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
    if (supported) {
      setShowCamera(true);
    } else {
      // 카메라를 직접 열 수 없는 구형 브라우저는 기본 카메라 앱으로 대체
      fileRef.current?.click();
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleCameraCapture(file: File) {
    setShowCamera(false);
    await processFile(file);
  }

  async function handleConfirm() {
    if (!pendingFile) return;
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("order_id", orderId);
      if (alsoOrderIds && alsoOrderIds.length > 0) formData.set("also_order_ids", alsoOrderIds.join(","));
      formData.set("photo", pendingFile);
      const result = await onSubmit(formData);
      if (!result.success) {
        alert(result.error ?? "처리 중 오류가 발생했어요");
        setPending(false);
        return;
      }
      setPendingFile(null);
      setPreviewUrl(null);
      router.refresh();
    } catch {
      alert("처리 중 알 수 없는 오류가 발생했어요");
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={openCamera}
        className="flex items-center gap-1.5 text-xs rounded-md bg-primary text-white px-3 py-1.5 disabled:opacity-50"
      >
        {pending && <Spinner className="h-3 w-3" />}
        {pending ? "처리 중..." : label}
      </button>
      {/* 카메라를 직접 열 수 없는 환경을 위한 대체 수단 (평소엔 사용되지 않음) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {showCamera && (
        <CameraCaptureModal
          overlayLines={watermarkLines}
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <p className="mb-3 text-sm font-medium">이 내용으로 배송완료 처리할까요?</p>
            {(confirmAddress || confirmItemsSummary) && (
              <div className="mb-3 rounded-lg bg-neutral-50 p-3 text-sm">
                {confirmAddress && (
                  <p className="mb-1">
                    <span className="text-neutral-500">배송지</span> {confirmAddress}
                  </p>
                )}
                {confirmItemsSummary && (
                  <p>
                    <span className="text-neutral-500">상품</span> {confirmItemsSummary}
                  </p>
                )}
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="배송완료 사진" className="mb-4 w-full rounded-lg" />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setPendingFile(null);
                  setPreviewUrl(null);
                }}
                className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm"
              >
                다시 선택
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={handleConfirm}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {pending && <Spinner className="h-3 w-3" />}
                {pending ? "처리 중..." : "확인, 배송완료 처리"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
