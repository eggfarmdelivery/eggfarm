"use client";

import { useState } from "react";
import { updateSettings } from "./actions";
import Spinner from "@/components/Spinner";

export default function SettingsClient({ config }: { config: Record<string, string> }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const result = await updateSettings(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch {
      setError("저장 중 알 수 없는 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="px-5 space-y-5">
      <section>
        <p className="text-sm font-medium mb-2">입금 계좌 정보</p>
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">은행명</label>
            <input
              name="bank_name"
              defaultValue={config.bank_name}
              placeholder="예: 카카오뱅크"
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">계좌번호</label>
            <input
              name="bank_account"
              defaultValue={config.bank_account}
              placeholder="숫자만 입력"
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">예금주</label>
            <input
              name="bank_holder"
              defaultValue={config.bank_holder}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section>
        <p className="text-sm font-medium mb-2">카카오 오픈채팅 문의</p>
        <label className="mb-1 block text-xs text-neutral-500">오픈채팅 URL</label>
        <input
          name="kakao_openchat_url"
          defaultValue={config.kakao_openchat_url}
          placeholder="https://open.kakao.com/o/..."
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-neutral-400">
          비워두면 문의 버튼이 화면에 안 보여요
        </p>
      </section>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium text-white disabled:opacity-60 ${
          justSaved ? "bg-green-600" : "bg-primary"
        }`}
      >
        {pending && <Spinner />}
        {pending ? "저장 중..." : justSaved ? "✓ 저장됨" : "저장"}
      </button>
    </form>
  );
}
