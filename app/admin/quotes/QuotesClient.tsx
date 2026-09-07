"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markQuoteReplied } from "./actions";

type Quote = {
  id: string;
  business_name: string;
  contact_phone: string;
  content: string;
  status: string;
  created_at: string;
};

export default function QuotesClient({ quotes }: { quotes: Quote[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  async function handleReplied(id: string) {
    setBusy(id);
    try {
      const result = await markQuoteReplied(id);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-5 space-y-2">
      {quotes.length === 0 && (
        <p className="text-sm text-neutral-400 py-6 text-center">
          접수된 견적 문의가 없어요
        </p>
      )}
      {quotes.map((q) => (
        <div key={q.id} className="rounded-lg border border-neutral-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{q.business_name}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                q.status === "신규"
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {q.status}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mb-1">{q.contact_phone}</p>
          <p className="text-sm mb-2">{q.content}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">
              {new Date(q.created_at).toLocaleDateString("ko-KR")}
            </span>
            {q.status === "신규" && (
              <button
                disabled={busy === q.id}
                onClick={() => handleReplied(q.id)}
                className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
              >
                회신완료 처리
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
