"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitOnboarding } from "./actions";

type Zone = { id: string; name: string };

export default function OnboardingClient({ zones }: { zones: Zone[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await submitOnboarding(formData);
      router.push("/b2c");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했어요");
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-neutral-500">이름</label>
        <input
          name="name"
          required
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">전화번호</label>
        <input
          name="phone"
          required
          type="tel"
          placeholder="010-0000-0000"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">배송 단지</label>
        <select
          name="delivery_zone_id"
          required
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        >
          <option value="">단지를 선택해주세요</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
        {zones.length === 0 && (
          <p className="mt-1 text-xs text-red-500">
            현재 배송가능한 단지가 없어요. 관리자에게 문의해주세요
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">상세주소</label>
        <input
          name="address"
          required
          placeholder="동/호수까지 정확히 입력해주세요"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">
          공동현관 비밀번호 <span className="text-neutral-400">(선택)</span>
        </label>
        <input
          name="entrance_password"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending || zones.length === 0}
        className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        저장하고 시작하기
      </button>
    </form>
  );
}
