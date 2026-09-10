"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import { addTimestampWatermark } from "@/lib/watermark";

export default function PhotoUploadButton({
  orderId,
  label,
  confirmAddress,
  confirmItemsSummary,
  onSubmit,
}: {
  orderId: string;
  label: string;
  confirmAddress?: string | null;
  confirmItemsSummary?: string;
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}) {
  const [pending, setPending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPending(true);
    try {
      const watermarked = await addTimestampWatermark(file);
      setPendingFile(watermarked);
      setPreviewUrl(URL.createObjectURL(watermarked));
    } catch {
      alert("사진 처리 중 오류가 발생했어요");
    } finally {
      setPending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleConfirm() {
    if (!pendingFile) return;
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("order_id", orderId);
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
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1.5 text-xs rounded-md bg-primary text-white px-3 py-1.5 disabled:opacity-50"
      >
        {pending && <Spinner className="h-3 w-3" />}
        {pending ? "처리 중..." : label}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

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
