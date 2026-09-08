"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveOverflow,
  rejectOverflow,
  confirmB2CPayment,
  startB2CDelivery,
  markB2CDelivered,
  startB2BDelivery,
  markB2BDelivered,
  confirmB2BPayment,
  revertB2CStatus,
  revertB2BStatus,
  confirmBankRefund,
} from "./actions";
import Spinner from "@/components/Spinner";

type B2COrder = {
  id: string;
  order_type: string;
  status: string;
  is_overflow: boolean;
  total_amount: number;
  created_at: string;
  campaign_id: string | null;
  campaign: { title: string | null } | null;
  account: { name: string | null; phone: string | null; nickname: string | null } | null;
  b2c_order_item: { quantity: number; product: { name: string } | null }[];
};

type B2BOrder = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  account: { business_name: string | null } | null;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PhotoUploadButton({
  orderId,
  label,
  onSubmit,
}: {
  orderId: string;
  label: string;
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}) {
  const [pending, setPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("order_id", orderId);
      formData.set("photo", file);
      const result = await onSubmit(formData);
      if (!result.success) {
        alert(result.error ?? "처리 중 오류가 발생했어요");
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      alert("처리 중 알 수 없는 오류가 발생했어요");
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1.5 text-xs rounded-md bg-primary text-white px-3 py-1.5 disabled:opacity-50"
      >
        {pending && <Spinner className="h-3 w-3" />}
        {pending ? "업로드 중..." : label}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

function useAction() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(true);
    try {
      const result = await fn();
      if (!result.success) {
        alert(result.error ?? "처리 중 오류가 발생했어요");
        return;
      }
      router.refresh();
    } catch {
      alert("처리 중 알 수 없는 오류가 발생했어요");
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}

function B2COrderCard({ order }: { order: B2COrder }) {
  const { busy, run } = useAction();
  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">
          {order.account?.nickname ?? order.account?.name ?? "이름없음"}
          {order.account?.phone ? ` · ${order.account.phone.slice(-4)}` : ""}
        </span>
        <span className="text-xs text-neutral-500">{order.status}</span>
      </div>
      {order.campaign?.title && (
        <p className="mb-1 text-xs text-primary">{order.campaign.title}</p>
      )}
      <p className="text-xs text-neutral-500 mb-1">
        {order.order_type}배송 · {order.total_amount.toLocaleString()}원
      </p>
      {(order.b2c_order_item ?? []).length > 0 && (
        <p className="text-xs text-neutral-400 mb-1">
          {order.b2c_order_item
            .map((i) => `${i.product?.name ?? "상품"} ${i.quantity}판`)
            .join(" · ")}
        </p>
      )}
      <p className="text-xs text-neutral-400 mb-1">{formatTime(order.created_at)}</p>
      {order.is_overflow && (
        <p className="text-xs text-orange-600 mb-2">⚠ 재고 초과분 - 승인 필요</p>
      )}
      <div className="flex gap-2 flex-wrap items-center">
        {order.is_overflow && (
          <>
            <button
              disabled={busy}
              onClick={() => run(() => approveOverflow(order.id))}
              className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
            >
              초과분 승인
            </button>
            <button
              disabled={busy}
              onClick={() => run(() => rejectOverflow(order.id))}
              className="text-xs rounded-md border border-neutral-300 px-3 py-1.5"
            >
              거절
            </button>
          </>
        )}
        {order.status === "입금대기" && !order.is_overflow && (
          <button
            disabled={busy}
            onClick={() => run(() => confirmB2CPayment(order.id))}
            className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
          >
            입금확인
          </button>
        )}
        {order.status === "입금확인완료" && (
          <button
            disabled={busy}
            onClick={() => run(() => startB2CDelivery(order.id))}
            className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
          >
            배송준비 시작
          </button>
        )}
        {(order.status === "배송준비" || order.status === "배송위임") && (
          <PhotoUploadButton orderId={order.id} label="배송완료 사진" onSubmit={markB2CDelivered} />
        )}
        {order.status === "환불대기" && (
          <button
            disabled={busy}
            onClick={() => run(() => confirmBankRefund(order.id))}
            className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
          >
            계좌이체 완료 처리
          </button>
        )}
        {["입금확인완료", "배송준비", "배송완료", "승인거절"].includes(order.status) && (
          <button
            disabled={busy}
            onClick={() => {
              if (confirm("이전 단계로 되돌릴까요?")) run(() => revertB2CStatus(order.id));
            }}
            className="text-xs rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-500"
          >
            ← 이전 단계로
          </button>
        )}
      </div>
    </div>
  );
}

function B2BOrderCard({ order }: { order: B2BOrder }) {
  const { busy, run } = useAction();
  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm">
          {order.account?.business_name ?? "거래처"} · {order.total_amount.toLocaleString()}원
        </span>
        <span className="text-xs text-neutral-500">{order.status}</span>
      </div>
      <p className="text-xs text-neutral-400 mb-2">{formatTime(order.created_at)}</p>
      <div className="flex gap-2 flex-wrap items-center">
        {order.status === "발주요청" && (
          <button
            disabled={busy}
            onClick={() => run(() => startB2BDelivery(order.id))}
            className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
          >
            배송시작
          </button>
        )}
        {order.status === "배송중" && (
          <PhotoUploadButton
            orderId={order.id}
            label="배송완료 사진(입금요청 알림)"
            onSubmit={markB2BDelivered}
          />
        )}
        {order.status === "입금대기" && (
          <button
            disabled={busy}
            onClick={() => run(() => confirmB2BPayment(order.id))}
            className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
          >
            입금확인
          </button>
        )}
        {["배송중", "입금대기", "입금확인완료"].includes(order.status) && (
          <button
            disabled={busy}
            onClick={() => {
              if (confirm("이전 단계로 되돌릴까요?")) run(() => revertB2BStatus(order.id));
            }}
            className="text-xs rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-500"
          >
            ← 이전 단계로
          </button>
        )}
      </div>
    </div>
  );
}

// 상태별 접기/펼치기 섹션 (진행중 탭 전용)
function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex w-full items-center justify-between py-1"
      >
        <span className="text-sm font-medium">
          {title} ({count})
        </span>
        <span className="text-xs text-neutral-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  );
}

const PROGRESS_STATUSES = [
  "입금대기",
  "입금확인완료",
  "배송준비",
  "배송위임",
  "배송중",
  "환불대기",
];
const DONE_STATUSES = ["배송완료", "취소", "승인거절", "환불완료"];
const B2B_PROGRESS = ["발주요청", "배송중", "입금대기", "입금확인완료"];
const B2B_DONE = ["배송완료", "취소"];

// 완료/취소 탭 (날짜 필터, 기본 오늘)
function DoneTab<T extends { id: string; status: string; created_at: string }>({
  orders,
  statuses,
  renderCard,
}: {
  orders: T[];
  statuses: string[];
  renderCard: (o: T) => React.ReactNode;
}) {
  const [range, setRange] = useState<"today" | "3d" | "7d" | "all">("today");

  const filtered = useMemo(() => {
    const base = orders.filter((o) => statuses.includes(o.status));
    if (range === "all") return base;
    const days = range === "today" ? 0 : range === "3d" ? 3 : 7;
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    return base.filter((o) => new Date(o.created_at) >= from);
  }, [orders, statuses, range]);

  return (
    <div>
      <div className="mb-3 flex gap-1.5">
        {[
          { key: "today", label: "오늘" },
          { key: "3d", label: "최근 3일" },
          { key: "7d", label: "최근 7일" },
          { key: "all", label: "전체" },
        ].map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key as typeof range)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              range === r.key ? "bg-primary text-white" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-400">해당 기간에 내역이 없어요</p>
        )}
        {filtered.map((o) => (
          <div key={o.id}>{renderCard(o)}</div>
        ))}
      </div>
    </div>
  );
}

export default function ConsoleClient({
  b2cOrders,
  b2bOrders,
}: {
  b2cOrders: B2COrder[];
  b2bOrders: B2BOrder[];
}) {
  const [topTab, setTopTab] = useState<"b2c" | "b2b">("b2c");
  const [b2cSubTab, setB2cSubTab] = useState<"progress" | "done">("progress");
  const [b2bSubTab, setB2bSubTab] = useState<"progress" | "done">("progress");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [nicknameQuery, setNicknameQuery] = useState("");
  const router = useRouter();

  // 30초마다 자동 새로고침(수동 새로고침 없이도 최신 주문 반영)
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(interval);
  }, [router]);

  const campaignOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of b2cOrders) {
      if (o.campaign_id) map.set(o.campaign_id, o.campaign?.title ?? "제목없음");
    }
    return Array.from(map.entries());
  }, [b2cOrders]);

  const visibleB2cOrders = useMemo(() => {
    let result = b2cOrders;
    if (campaignFilter !== "all") {
      result = result.filter((o) => o.campaign_id === campaignFilter);
    }
    const q = nicknameQuery.trim();
    if (q) {
      result = result.filter((o) => {
        const nickname = o.account?.nickname ?? "";
        const name = o.account?.name ?? "";
        const phone = o.account?.phone ?? "";
        return nickname.includes(q) || name.includes(q) || phone.includes(q);
      });
    }
    return result;
  }, [b2cOrders, campaignFilter, nicknameQuery]);

  const b2cProgress = visibleB2cOrders.filter((o) => PROGRESS_STATUSES.includes(o.status));
  const b2cOverflow = b2cProgress.filter((o) => o.is_overflow);
  const b2bProgress = b2bOrders.filter((o) => B2B_PROGRESS.includes(o.status));

  const progressCountB2c = b2cProgress.length;
  const doneCountB2c = visibleB2cOrders.filter((o) => DONE_STATUSES.includes(o.status)).length;
  const progressCountB2b = b2bProgress.length;
  const doneCountB2b = b2bOrders.filter((o) => B2B_DONE.includes(o.status)).length;

  return (
    <div className="px-5">
      <div className="mb-4 flex gap-2 border-b border-neutral-200">
        <button
          onClick={() => setTopTab("b2c")}
          className={`px-3 py-2 text-sm ${
            topTab === "b2c" ? "border-b-2 border-primary font-semibold text-primary" : "text-neutral-400"
          }`}
        >
          B2C ({b2cOrders.length})
        </button>
        <button
          onClick={() => setTopTab("b2b")}
          className={`px-3 py-2 text-sm ${
            topTab === "b2b" ? "border-b-2 border-primary font-semibold text-primary" : "text-neutral-400"
          }`}
        >
          B2B ({b2bOrders.length})
        </button>
      </div>

      {topTab === "b2c" ? (
        <>
          {campaignOptions.length > 0 && (
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="mb-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            >
              <option value="all">전체 캠페인</option>
              {campaignOptions.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          )}
          <input
            value={nicknameQuery}
            onChange={(e) => setNicknameQuery(e.target.value)}
            placeholder="닉네임/이름/전화번호로 검색"
            className="mb-4 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />

          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setB2cSubTab("progress")}
              className={`rounded-lg border py-2.5 text-center ${
                b2cSubTab === "progress" ? "border-primary bg-primary-bg" : "border-neutral-200"
              }`}
            >
              <p className={`text-sm font-medium ${b2cSubTab === "progress" ? "text-primary" : ""}`}>
                진행중 {progressCountB2c}
              </p>
            </button>
            <button
              onClick={() => setB2cSubTab("done")}
              className={`rounded-lg border py-2.5 text-center ${
                b2cSubTab === "done" ? "border-primary bg-primary-bg" : "border-neutral-200"
              }`}
            >
              <p className={`text-sm font-medium ${b2cSubTab === "done" ? "text-primary" : ""}`}>
                완료·취소 {doneCountB2c}
              </p>
            </button>
          </div>

          {b2cSubTab === "progress" ? (
            <>
              {b2cOverflow.length > 0 && (
                <CollapsibleSection title="초과승인대기" count={b2cOverflow.length}>
                  {b2cOverflow.map((o) => (
                    <B2COrderCard key={o.id} order={o} />
                  ))}
                </CollapsibleSection>
              )}
              {PROGRESS_STATUSES.map((status) => {
                const list = b2cProgress.filter((o) => o.status === status && !o.is_overflow);
                return (
                  <CollapsibleSection key={status} title={status} count={list.length}>
                    {list.map((o) => (
                      <B2COrderCard key={o.id} order={o} />
                    ))}
                  </CollapsibleSection>
                );
              })}
              {progressCountB2c === 0 && (
                <p className="py-6 text-center text-sm text-neutral-400">진행중인 주문이 없어요</p>
              )}
            </>
          ) : (
            <DoneTab
              orders={visibleB2cOrders}
              statuses={DONE_STATUSES}
              renderCard={(o) => <B2COrderCard order={o} />}
            />
          )}
        </>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setB2bSubTab("progress")}
              className={`rounded-lg border py-2.5 text-center ${
                b2bSubTab === "progress" ? "border-primary bg-primary-bg" : "border-neutral-200"
              }`}
            >
              <p className={`text-sm font-medium ${b2bSubTab === "progress" ? "text-primary" : ""}`}>
                진행중 {progressCountB2b}
              </p>
            </button>
            <button
              onClick={() => setB2bSubTab("done")}
              className={`rounded-lg border py-2.5 text-center ${
                b2bSubTab === "done" ? "border-primary bg-primary-bg" : "border-neutral-200"
              }`}
            >
              <p className={`text-sm font-medium ${b2bSubTab === "done" ? "text-primary" : ""}`}>
                완료·취소 {doneCountB2b}
              </p>
            </button>
          </div>

          {b2bSubTab === "progress" ? (
            <>
              {B2B_PROGRESS.map((status) => {
                const list = b2bProgress.filter((o) => o.status === status);
                return (
                  <CollapsibleSection key={status} title={status} count={list.length}>
                    {list.map((o) => (
                      <B2BOrderCard key={o.id} order={o} />
                    ))}
                  </CollapsibleSection>
                );
              })}
              {progressCountB2b === 0 && (
                <p className="py-6 text-center text-sm text-neutral-400">진행중인 발주가 없어요</p>
              )}
            </>
          ) : (
            <DoneTab
              orders={b2bOrders}
              statuses={B2B_DONE}
              renderCard={(o) => <B2BOrderCard order={o} />}
            />
          )}
        </>
      )}
    </div>
  );
}
