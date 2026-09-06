"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitB2BOnboarding } from "./actions";

export default function OnboardingB2BClient() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await submitB2BOnboarding(formData);
      router.push("/b2b");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했어요");
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-neutral-500">업체명</label>
        <input
          name="business_name"
          required
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">담당자명</label>
        <input
          name="name"
          required
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">연락처</label>
        <input
          name="phone"
          required
          type="tel"
          placeholder="010-0000-0000"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">배송지 주소</label>
        <input
          name="address"
          required
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#3D2E1A] py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        저장하고 시작하기
      </button>
    </form>
  );
}
