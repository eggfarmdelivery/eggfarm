"use client";

import { useState } from "react";
import { searchAccounts, resetTestAccount, type AccountSearchResult } from "./actions";
import Spinner from "@/components/Spinner";

export default function TestAccountReset() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AccountSearchResult[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  async function handleSearch() {
    setPending(true);
    setError(null);
    setDoneMessage(null);
    const result = await searchAccounts(query);
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setResults(result);
  }

  async function handleReset(account: AccountSearchResult) {
    const label = account.nickname ?? account.name ?? "이 계정";
    if (!confirm(`"${label}" 계정과 관련 주문/크레딧 데이터를 전부 삭제할까요? 되돌릴 수 없어요`)) return;
    setResettingId(account.id);
    setError(null);
    const result = await resetTestAccount(account.id);
    setResettingId(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setResults((prev) => prev.filter((r) => r.id !== account.id));
    setDoneMessage(`"${label}" 계정을 초기화했어요`);
  }

  return (
    <section className="mt-8 border-t border-neutral-200 pt-6">
      <p className="mb-1 text-sm font-medium">테스트 계정 초기화</p>
      <p className="mb-3 text-xs text-neutral-400">
        닉네임/이름/전화번호로 검색 후 계정과 관련 데이터(크레딧, 주문 등)를 전부 삭제해요
      </p>
      <div className="mb-3 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="닉네임/이름/전화번호"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={pending}
          className="shrink-0 rounded-lg bg-neutral-800 px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? <Spinner /> : "검색"}
        </button>
      </div>

      {doneMessage && (
        <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {doneMessage}
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="space-y-2">
        {results.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2.5"
          >
            <div className="text-sm">
              <p>{r.nickname ?? r.name ?? "이름없음"}</p>
              <p className="text-xs text-neutral-400">{r.phone ?? "-"}</p>
            </div>
            <button
              type="button"
              disabled={resettingId === r.id}
              onClick={() => handleReset(r)}
              className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-500 disabled:opacity-50"
            >
              {resettingId === r.id ? "처리 중..." : "초기화"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
