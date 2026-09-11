"use client";

import { useState } from "react";
import { searchAccounts, resetTestAccount, setTestAccount, type AccountSearchResult } from "./actions";
import Spinner from "@/components/Spinner";

export default function TestAccountReset() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AccountSearchResult[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
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

  async function handleToggleTest(account: AccountSearchResult) {
    const nextValue = !account.is_test;
    setTogglingId(account.id);
    setError(null);
    const result = await setTestAccount(account.id, nextValue);
    setTogglingId(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setResults((prev) => prev.map((r) => (r.id === account.id ? { ...r, is_test: nextValue } : r)));
    setDoneMessage(nextValue ? "테스트계정으로 지정했어요" : "테스트계정 지정을 해제했어요");
  }

  return (
    <section className="mt-8 border-t border-neutral-200 pt-6">
      <p className="mb-1 text-sm font-medium">테스트 계정 관리</p>
      <p className="mb-3 text-xs text-neutral-400">
        닉네임/이름/전화번호로 검색 후, 반복 테스트용으로 쓸 계정을 지정하거나(캠페인 재고·대시보드
        통계에서 제외됨) 계정과 관련 데이터를 완전히 삭제할 수 있어요
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
              <p className="flex items-center gap-1.5">
                {r.nickname ?? r.name ?? "이름없음"}
                {r.is_test && (
                  <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-white">
                    테스트
                  </span>
                )}
              </p>
              <p className="text-xs text-neutral-400">{r.phone ?? "-"}</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                disabled={togglingId === r.id}
                onClick={() => handleToggleTest(r)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 disabled:opacity-50"
              >
                {togglingId === r.id ? "처리 중..." : r.is_test ? "테스트 해제" : "테스트로 지정"}
              </button>
              <button
                type="button"
                disabled={resettingId === r.id}
                onClick={() => handleReset(r)}
                className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-500 disabled:opacity-50"
              >
                {resettingId === r.id ? "처리 중..." : "초기화"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
