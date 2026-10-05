"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addStock, setStock } from "./actions";

type P = { id: string; name: string; photo_url: string | null; stock: number };
type Log = { id: string; name: string; delta: number; qtyAfter: number; reason: string; createdAt: string };

function Card({ p, threshold }: { p: P; threshold: number }) {
  const router = useRouter();
  const [custom, setCustom] = useState("");
  const [editing, setEditing] = useState(false);
  const [exact, setExact] = useState(String(p.stock));
  const [busy, setBusy] = useState(false);

  const out = p.stock <= 0;
  const low = !out && p.stock <= threshold;
  const barMax = Math.max(60, threshold * 6, p.stock);
  const pct = Math.min(100, (p.stock / barMax) * 100);
  const thPct = Math.min(100, (threshold / barMax) * 100);

  async function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    if (busy) return;
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.success) {
      alert(r.error ?? "처리 중 오류가 발생했어요");
      return;
    }
    setCustom("");
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="mt-2.5 rounded-xl border border-neutral-200 bg-white p-3.5">
      <div className="flex items-center gap-2.5">
        <div className="h-[46px] w-[46px] shrink-0 overflow-hidden rounded-lg bg-neutral-100">
          {p.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <span className="flex-1 text-sm font-bold">{p.name}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
            out
              ? "bg-neutral-200 text-neutral-600"
              : low
                ? "bg-red-50 text-red-500"
                : "bg-primary-bg text-primary-dark"
          }`}
        >
          {out ? "품절" : low ? "부족" : "충분"}
        </span>
      </div>

      <p className={`mt-2.5 text-[26px] font-bold tracking-tight ${low ? "text-red-500" : ""}`}>
        {p.stock}
        <small className="ml-1 text-xs font-normal text-neutral-400">
          {out ? "판 · 주문 막힘" : "판 남음"}
        </small>
      </p>

      {!out && (
        <>
          <div className="relative mt-2 h-1.5 rounded-full bg-neutral-100">
            <div
              className={`h-full rounded-full ${low ? "bg-red-500" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
            <div
              className="absolute -top-[3px] h-3 w-0.5 bg-neutral-500/60"
              style={{ left: `${thPct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-neutral-400">
            <span>0</span>
            <span>알림 기준 {threshold}판</span>
            <span>{barMax}</span>
          </div>
        </>
      )}

      <div className="mt-3 flex gap-1.5">
        {[10, 50, 100].map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            onClick={() => run(() => addStock(p.id, n))}
            className="flex-1 rounded-lg border border-primary py-2 text-xs font-medium text-primary disabled:opacity-50"
          >
            +{n}
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-1.5">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          placeholder="직접 입력"
          className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-xs"
        />
        <button
          type="button"
          disabled={busy || !custom}
          onClick={() => run(() => addStock(p.id, Number(custom)))}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
        >
          입고
        </button>
      </div>

      <div className="mt-2 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-[11px] text-neutral-400">실제 재고</span>
            <input
              value={exact}
              onChange={(e) => setExact(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              className="w-20 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              disabled={busy || exact === ""}
              onClick={() => run(() => setStock(p.id, Number(exact)))}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs"
            >
              맞추기
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setExact(String(p.stock));
              setEditing(true);
            }}
            className="text-[11px] text-neutral-400 underline"
          >
            재고 직접 수정
          </button>
        )}
      </div>
    </div>
  );
}

export default function StockClient({
  products,
  threshold,
  logs,
}: {
  products: P[];
  threshold: number;
  logs: Log[];
}) {
  const low = products.filter((p) => p.stock > 0 && p.stock <= threshold).length;
  const out = products.filter((p) => p.stock <= 0).length;

  return (
    <div className="px-5">
      <div className="mt-3 grid grid-cols-3 divide-x divide-neutral-100 rounded-xl border border-neutral-200 bg-white text-center text-[11px] text-neutral-400">
        <div className="py-3">
          전체<b className="block text-xl text-neutral-900">{products.length}</b>
        </div>
        <div className="py-3">
          부족<b className={`block text-xl ${low ? "text-red-500" : "text-neutral-900"}`}>{low}</b>
        </div>
        <div className="py-3">
          품절<b className={`block text-xl ${out ? "text-red-500" : "text-neutral-900"}`}>{out}</b>
        </div>
      </div>

      {products.map((p) => (
        <Card key={`${p.id}-${p.stock}`} p={p} threshold={threshold} />
      ))}

      <h2 className="mb-2 mt-6 text-sm font-bold">최근 재고 기록</h2>
      <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white text-xs">
        {logs.length === 0 && <p className="px-4 py-6 text-center text-neutral-400">아직 기록이 없어요</p>}
        {logs.map((l) => (
          <div key={l.id} className="flex items-center justify-between px-4 py-2.5">
            <div>
              <p className="font-medium">
                {l.name} <span className="font-normal text-neutral-400">· {l.reason}</span>
              </p>
              <p className="text-[10px] text-neutral-400">
                {new Date(l.createdAt).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </p>
            </div>
            <div className="text-right">
              <p className={`font-bold ${l.delta > 0 ? "text-primary" : "text-red-500"}`}>
                {l.delta > 0 ? `+${l.delta}` : l.delta}
              </p>
              <p className="text-[10px] text-neutral-400">재고 {l.qtyAfter}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
