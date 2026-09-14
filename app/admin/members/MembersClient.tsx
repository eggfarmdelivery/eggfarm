"use client";

import { useState } from "react";
import { searchMembers, type MemberSearchResult } from "./actions";

export default function MembersClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    const result = await searchMembers(query);
    setSearching(false);
    setSearched(true);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setResults(result);
  }

  return (
    <div className="px-5">
      <div className="mb-3 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="닉네임/실명/전화번호/상호명으로 검색"
          className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {searching ? "검색 중..." : "검색"}
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
      {searched && !error && results.length === 0 && (
        <p className="py-6 text-center text-sm text-neutral-400">검색 결과가 없어요</p>
      )}

      <div className="space-y-2">
        {results.map((m) => (
          <div key={m.id} className="rounded-lg border border-neutral-200 p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                {m.role === "b2c" ? "일반회원" : "사업자회원"}
              </span>
              <span className="text-sm font-medium">
                {m.role === "b2c" ? m.nickname ?? m.name ?? "이름없음" : m.business_name ?? "상호명없음"}
              </span>
              {m.is_test && (
                <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-white">테스트</span>
              )}
              {m.role === "b2b" && m.approval_status && (
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                  {m.approval_status}
                </span>
              )}
            </div>

            {m.role === "b2c" ? (
              <>
                <p className="text-xs text-neutral-500">
                  실명 {m.name ?? "-"} · {m.phone ?? "-"}
                </p>
                <p className="text-xs text-neutral-500">
                  {m.zone_name ?? "단지 미지정"}
                  {m.address_dong && m.address_ho && ` · ${m.address_dong}동 ${m.address_ho}호`}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-neutral-500">
                  담당자 {m.name ?? "-"} · {m.phone ?? "-"}
                </p>
                <p className="text-xs text-neutral-500">
                  {m.business_type ?? "-"} · {m.business_number ?? "-"}
                </p>
                {m.address && <p className="mt-1 text-xs text-blue-700">📍 {m.address}</p>}
              </>
            )}
            {m.entrance_password && (
              <p className="text-xs text-blue-700">🔑 {m.entrance_password}</p>
            )}
            <p className="mt-1 text-xs text-neutral-400">
              가입일 {new Date(m.created_at).toLocaleDateString("ko-KR")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
