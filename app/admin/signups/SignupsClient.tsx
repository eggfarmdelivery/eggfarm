"use client";

import { useRouter } from "next/navigation";

type Row = {
  id: string;
  nickname: string | null;
  phone: string | null;
  zoneName: string;
  createdAt: string;
};

export default function SignupsClient({ rows, period }: { rows: Row[]; period: string }) {
  const router = useRouter();

  return (
    <div className="px-5">
      <div className="mb-3 flex gap-2">
        {[
          { key: "week", label: "이번주" },
          { key: "month", label: "이번달" },
          { key: "all", label: "전체" },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => router.push(`/admin/signups?range=${opt.key}`)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              period === opt.key ? "bg-primary text-white" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="mb-2 text-xs text-neutral-400">{rows.length}명</p>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">해당 기간에 가입한 회원이 없어요</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2.5"
            >
              <div>
                <p className="text-sm">{r.nickname ?? "닉네임없음"}</p>
                <p className="text-xs text-neutral-500">
                  {r.zoneName} · {r.phone ?? "-"}
                </p>
              </div>
              <span className="text-xs text-neutral-400">
                {new Date(r.createdAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
