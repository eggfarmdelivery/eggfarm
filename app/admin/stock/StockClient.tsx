"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addStock, setStock, saveStockLimits, moveProduct } from "./actions";
import { createProduct, updateProduct } from "../products/actions";
import Spinner from "@/components/Spinner";
import { Plus, Check } from "lucide-react";

type P = {
  id: string;
  name: string;
  base_price: number;
  photo_url: string | null;
  stock: number;
  is_active: boolean;
};
type Log = { id: string; name: string; delta: number; qtyAfter: number; reason: string; createdAt: string };


function formatNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString();
}

function PriceInput({ name, defaultValue }: { name: string; defaultValue?: number }) {
  const [display, setDisplay] = useState(defaultValue !== undefined ? defaultValue.toLocaleString() : "");
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => setDisplay(formatNumber(e.target.value))}
        placeholder="0"
        className="w-full rounded-md border border-neutral-200 px-3 py-2 pr-8 text-sm"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">원</span>
      <input type="hidden" name={name} value={display.replace(/,/g, "")} />
    </div>
  );
}

function LimitsCard({ threshold, perPersonLimit }: { threshold: number; perPersonLimit: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const r = await saveStockLimits(formData);
      if (!r.success) {
        setError(r.error);
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setError("저장 중 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="mt-3 rounded-xl border border-neutral-200 bg-white p-3.5">
      <p className="mb-2 text-xs font-bold text-neutral-700">주문·알림 기준</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">인당 한도 (같은 배송일 합산, 판)</label>
          <input
            name="limit"
            defaultValue={perPersonLimit}
            inputMode="numeric"
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">재고 알림 기준 (판 이하)</label>
          <input
            name="threshold"
            defaultValue={threshold}
            inputMode="numeric"
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <p className="mt-1.5 text-[10px] text-neutral-400">인당 한도 0 = 제한 없음</p>
      {error && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60 ${
          saved ? "bg-green-600" : "bg-primary"
        }`}
      >
        {pending && <Spinner />}
        {pending ? "저장 중..." : saved ? "저장됨" : "저장"}
      </button>
    </form>
  );
}

function CreateProductForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justDone, setJustDone] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const result = await createProduct(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setJustDone(true);
      router.refresh();
      setTimeout(() => {
        setJustDone(false);
        setOpen(false);
      }, 1200);
    } catch {
      setError("등록 중 알 수 없는 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary py-3 text-sm font-medium text-primary"
      >
        <Plus size={16} /> 신규 상품 등록
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="relative mt-3 space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
      {justDone && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/90">
          <p className="flex items-center gap-1.5 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
            <Check size={15} /> 등록 완료됐어요
          </p>
        </div>
      )}
      <p className="mb-1 text-sm font-medium">신규 상품 등록</p>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">사진 (선택)</label>
        <input type="file" name="photo" accept="image/*" className="text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">상품명</label>
        <input name="name" required className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">가격(원/판)</label>
        <PriceInput name="base_price" />
      </div>
      <p className="text-[11px] text-neutral-400">등록 후 아래 카드에서 입고하면 주문을 받을 수 있어요</p>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          {pending ? "등록 중..." : "등록"}
        </button>
      </div>
    </form>
  );
}

function InfoForm({ p }: { p: P }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("product_id", p.id);
    setPending(true);
    setError(null);
    try {
      const r = await updateProduct(formData);
      if (!r.success) {
        setError(r.error);
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setError("저장 중 알 수 없는 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="mt-3 border-t border-neutral-100 pt-2.5">
      <summary className="cursor-pointer text-xs font-medium text-neutral-500">상품 정보 수정 (이름·가격·사진·판매)</summary>
      <form action={handleSubmit} className="mt-2.5 space-y-2.5">
        <input name="name" defaultValue={p.name} className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium" />
        <PriceInput name="base_price" defaultValue={p.base_price} />
        <div>
          <label className="mb-1 block text-xs text-neutral-500">사진 교체(선택)</label>
          <input type="file" name="photo" accept="image/*" className="text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={p.is_active} />
          판매중 (끄면 주문화면에서 안 보임)
        </label>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60 ${
            saved ? "bg-green-600" : "bg-primary"
          }`}
        >
          {pending && <Spinner />}
          {pending ? "저장 중..." : saved ? "저장됨" : "저장"}
        </button>
      </form>
    </details>
  );
}

function Card({ p, threshold, first, last }: { p: P; threshold: number; first: boolean; last: boolean }) {
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
        <div className="flex shrink-0 flex-col gap-0.5">
          <button
            type="button"
            disabled={busy || first}
            onClick={() => run(() => moveProduct(p.id, -1))}
            aria-label="위로"
            className="h-5 w-6 rounded border border-neutral-200 text-[10px] leading-none text-neutral-500 disabled:opacity-30"
          >
            ▲
          </button>
          <button
            type="button"
            disabled={busy || last}
            onClick={() => run(() => moveProduct(p.id, 1))}
            aria-label="아래로"
            className="h-5 w-6 rounded border border-neutral-200 text-[10px] leading-none text-neutral-500 disabled:opacity-30"
          >
            ▼
          </button>
        </div>
        <div className="h-[42px] w-[56px] shrink-0 overflow-hidden rounded-lg bg-neutral-100">
          {p.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{p.name}</p>
          <p className="text-[11px] text-neutral-400">{p.base_price.toLocaleString()}원</p>
        </div>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
            !p.is_active || out
              ? "bg-neutral-200 text-neutral-600"
              : low
                ? "bg-red-50 text-red-500"
                : "bg-primary-bg text-primary-dark"
          }`}
        >
          {!p.is_active ? "판매중지" : out ? "품절" : low ? "부족" : "충분"}
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

      <InfoForm p={p} />
    </div>
  );
}

export default function StockClient({
  products,
  threshold,
  perPersonLimit,
  logs,
}: {
  products: P[];
  threshold: number;
  perPersonLimit: number;
  logs: Log[];
}) {
  const active = products.filter((p) => p.is_active);
  const low = active.filter((p) => p.stock > 0 && p.stock <= threshold).length;
  const out = active.filter((p) => p.stock <= 0).length;

  return (
    <div className="px-5">
      <div className="mt-3 grid grid-cols-3 divide-x divide-neutral-100 rounded-xl border border-neutral-200 bg-white text-center text-[11px] text-neutral-400">
        <div className="py-3">
          전체<b className="block text-xl text-neutral-900">{active.length}</b>
        </div>
        <div className="py-3">
          부족<b className={`block text-xl ${low ? "text-red-500" : "text-neutral-900"}`}>{low}</b>
        </div>
        <div className="py-3">
          품절<b className={`block text-xl ${out ? "text-red-500" : "text-neutral-900"}`}>{out}</b>
        </div>
      </div>

      <LimitsCard key={`${threshold}-${perPersonLimit}`} threshold={threshold} perPersonLimit={perPersonLimit} />

      <CreateProductForm />

      <p className="mt-3 text-[11px] text-neutral-400">▲▼ 로 손님 화면에 보이는 상품 순서를 바꿀 수 있어요</p>
      {products.map((p, i) => (
        <Card
          key={`${p.id}-${p.stock}-${p.name}-${p.base_price}-${p.is_active}`}
          p={p}
          threshold={threshold}
          first={i === 0}
          last={i === products.length - 1}
        />
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
