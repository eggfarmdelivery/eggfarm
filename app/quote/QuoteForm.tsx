"use client";

import { useState } from "react";
import { submitQuoteRequest } from "./actions";

export default function QuoteForm() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await submitQuoteRequest(formData);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "제출 중 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-sm text-neutral-600">
          문의가 접수됐어요. 담당자가 확인 후 연락드릴게요.
        </p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="px-5 space-y-3">
      <input
        name="business_name"
        placeholder="업체명"
        className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
      />
      <input
        name="contact_phone"
        placeholder="담당자 연락처"
        className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
      />
      <textarea
        name="content"
        placeholder="필요한 품목/수량, 문의내용을 적어주세요"
        rows={5}
        className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary py-3 text-white font-medium disabled:opacity-50"
      >
        {pending ? "제출 중..." : "문의하기"}
      </button>
    </form>
  );
}
