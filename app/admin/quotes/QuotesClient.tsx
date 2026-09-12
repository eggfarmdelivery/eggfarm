"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markQuoteReplied, rejectQuote } from "./actions";
import Badge from "@/components/Badge";

type Quote = {
  id: string;
  business_name: string;
  contact_phone: string;
  email: string | null;
  content: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
};

const STATUS_TONE: Record<string, "red" | "green" | "gray"> = {
  신규: "red",
  회신완료: "green",
  거절: "gray",
};

function QuoteCard({ q }: { q: Quote }) {
  const [busy, setBusy] = useState(false);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(q.admin_reply ?? "");
  const router = useRouter();

  async function handleReply() {
    setBusy(true);
    const result = await markQuoteReplied(q.id, reply);
    setBusy(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    setReplying(false);
    router.refresh();
  }

  async function handleReject() {
    if (!confirm("이 문의를 거절 처리할까요?")) return;
    setBusy(true);
    const result = await rejectQuote(q.id);
    setBusy(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{q.business_name}</span>
        <Badge tone={STATUS_TONE[q.status] ?? "gray"}>{q.status}</Badge>
      </div>
      <p className="text-xs text-neutral-500 mb-1">
        {q.contact_phone}
        {q.email && ` · ${q.email}`}
      </p>
      <p className="text-sm mb-2">{q.content}</p>

      {q.admin_reply && !replying && (
        <div className="mb-2 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          답변: {q.admin_reply}
        </div>
      )}

      {replying && (
        <div className="mb-2 space-y-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="답변을 입력하세요 (예: 특란 기준 판당 11,500원 가능해요. 오픈채팅으로 안내드릴게요)"
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
          />
          <div className="flex gap-1.5">
            <button
              onClick={() => setReplying(false)}
              disabled={busy}
              className="flex-1 rounded-md border border-neutral-200 py-1.5 text-xs"
            >
              취소
            </button>
            <button
              onClick={handleReply}
              disabled={busy || !reply.trim()}
              className="flex-1 rounded-md bg-primary py-1.5 text-xs text-white disabled:opacity-50"
            >
              {busy ? "저장 중..." : "답변 등록"}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">
          {new Date(q.created_at).toLocaleDateString("ko-KR")}
        </span>
        {q.status === "신규" && !replying && (
          <div className="flex gap-1.5">
            <button
              disabled={busy}
              onClick={handleReject}
              className="text-xs rounded-md border border-red-300 text-red-500 px-3 py-1.5"
            >
              거절
            </button>
            <button
              disabled={busy}
              onClick={() => setReplying(true)}
              className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
            >
              답변 작성
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuotesClient({ quotes }: { quotes: Quote[] }) {
  return (
    <div className="px-5 space-y-2">
      {quotes.length === 0 && (
        <p className="text-sm text-neutral-400 py-6 text-center">
          접수된 견적 문의가 없어요
        </p>
      )}
      {quotes.map((q) => (
        <QuoteCard key={q.id} q={q} />
      ))}
    </div>
  );
}
