"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveOverflow,
  rejectOverflow,
  confirmB2CPayment,
  startB2CDelivery,
  bulkStartB2CDelivery,
  markB2CDelivered,
  startB2BDelivery,
  markB2BDelivered,
  confirmB2BPayment,
  revertB2CStatus,
  revertB2BStatus,
  confirmRefund,
  adminCancelOrder,
} from "./actions";
import Spinner from "@/components/Spinner";
import PhotoUploadButton from "@/components/PhotoUploadButton";

type B2COrder = {
  id: string;
  order_type: string;
  status: string;
  is_overflow: boolean;
  total_amount: number;
  refund_bank_name: string | null;
  refund_account_number: string | null;
  refund_holder_name: string | null;
  created_at: string;
  campaign_id: string | null;
  campaign: { title: string | null } | null;
  account: { name: string | null; phone: string | null; nickname: string | null; address: string | null } | null;
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
    hour12: false,
  });
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

// 주문취소 확인 팝업 - 관리자가 유의할 수 있도록 경고만 보여주고 확정만 받음.
// 환불계좌 입력은 구매자 본인이 주문내역에서 취소할 때 이미 받고 있어서 여기선 요구하지 않음
function CancelOrderModal({
  order,
  onClose,
  onConfirm,
  busy,
}: {
  order: B2COrder;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const isPaid = order.status === "입금확인완료";
  const hasRefundAccount = order.refund_bank_name && order.refund_account_number;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <p className="mb-1 text-base font-medium text-red-600">⚠ 주문을 취소할까요?</p>
        <p className="mb-4 text-sm text-neutral-500">
          {order.account?.nickname ?? order.account?.name ?? "이름없음"}님의{" "}
          {order.total_amount.toLocaleString()}원 주문이{" "}
          {isPaid ? "환불대기 상태로 전환" : "취소"}됩니다. 이 작업은 되돌릴 수 없어요.
        </p>

        {isPaid && (
          <div className="mb-4 rounded-md bg-neutral-50 px-3 py-2.5 text-xs text-neutral-600">
            {hasRefundAccount ? (
              <>
                <p className="mb-1 font-medium text-neutral-700">구매자가 입력한 환불계좌</p>
                <p>
                  {order.refund_bank_name} {order.refund_account_number} ({order.refund_holder_name})
                </p>
              </>
            ) : (
              <p>아직 등록된 환불계좌가 없어요. 연락처로 확인해주세요{order.account?.phone && ` (${order.account.phone})`}.</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm font-medium text-neutral-600"
          >
            돌아가기
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-500 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "처리 중..." : "취소 확정"}
          </button>
        </div>
      </div>
    </div>
  );
}

function B2COrderCard({
  order,
  selectable,
  selected,
  onToggleSelect,
}: {
  order: B2COrder;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const { busy, run } = useAction();
  const [cancelTarget, setCancelTarget] = useState<B2COrder | null>(null);
  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-2 text-sm font-medium">
          {selectable && (
            <input
              type="checkbox"
              checked={!!selected}
              onChange={onToggleSelect}
              className="h-4 w-4"
            />
          )}
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
      {order.status === "환불대기" && (
        <div className="mb-2 rounded-md bg-orange-50 px-2.5 py-2 text-xs text-orange-700">
          <p>환불할 금액 {order.total_amount.toLocaleString()}원</p>
          {order.refund_bank_name && order.refund_account_number ? (
            <div className="flex items-center gap-1.5">
              <p>
                {order.refund_bank_name} {order.refund_account_number} ({order.refund_holder_name})
              </p>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(order.refund_account_number ?? "")}
                className="shrink-0 rounded border border-orange-300 px-1.5 py-0.5 text-[10px] text-orange-700"
              >
                복사
              </button>
            </div>
          ) : (
            <p className="font-medium">환불계좌 정보가 아직 없어요 - 고객에게 확인해주세요</p>
          )}
          {order.account?.phone && (
            <p className="mt-1 text-orange-500">연락처 {order.account.phone}</p>
          )}
        </div>
      )}
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
            배송중으로 변경
          </button>
        )}
        {(order.status === "배송중" || order.status === "배송위임") && (
          <PhotoUploadButton
            orderId={order.id}
            label="배송완료 사진"
            confirmAddress={order.account?.address}
            confirmItemsSummary={(order.b2c_order_item ?? [])
              .map((i) => `${i.product?.name ?? "상품"} ${i.quantity}판`)
              .join(", ")}
            onSubmit={markB2CDelivered}
          />
        )}
        {(order.status === "입금대기" || order.status === "입금확인완료") && (
          <button
            disabled={busy}
            onClick={() => setCancelTarget(order)}
            className="text-xs rounded-md border border-red-300 text-red-500 px-3 py-1.5"
          >
            주문취소
          </button>
        )}
        {order.status === "환불대기" && (
          <button
            disabled={busy}
            onClick={() => run(() => confirmRefund(order.id))}
            className="text-xs rounded-md bg-primary text-white px-3 py-1.5"
          >
            계좌이체 완료 처리
          </button>
        )}
        {["입금확인완료", "배송중", "배송완료", "승인거절"].includes(order.status) && (
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

      {cancelTarget && (
        <CancelOrderModal
          order={cancelTarget}
          busy={busy}
          onClose={() => setCancelTarget(null)}
          onConfirm={() => {
            run(() => adminCancelOrder(order.id)).then(() => setCancelTarget(null));
          }}
        />
      )}
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

const B2C_STATUS_TABS = [
  "입금대기",
  "입금확인완료",
  "배송중",
  "배송완료",
  "환불대기",
  "환불완료",
  "취소",
];
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
  const [activeB2cStatus, setActiveB2cStatus] = useState<string>(B2C_STATUS_TABS[0]);
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

  // 캠페인별 "아직 배송 안 된" 상품별 수량 합계 - 배송완료 처리될수록 자동으로 줄어듦
  const deliverySummary = useMemo(() => {
    if (campaignFilter === "all") return [];
    const pending = b2cOrders.filter(
      (o) => o.campaign_id === campaignFilter && ["입금확인완료", "배송중", "배송위임"].includes(o.status)
    );
    const map = new Map<string, number>();
    for (const o of pending) {
      for (const item of o.b2c_order_item ?? []) {
        const name = item.product?.name ?? "상품";
        map.set(name, (map.get(name) ?? 0) + item.quantity);
      }
    }
    return Array.from(map.entries());
  }, [b2cOrders, campaignFilter]);

  const [selectedForDelivery, setSelectedForDelivery] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);

  function toggleSelectForDelivery(id: string) {
    setSelectedForDelivery((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkStart() {
    setBulkPending(true);
    await bulkStartB2CDelivery(Array.from(selectedForDelivery));
    setSelectedForDelivery(new Set());
    setBulkPending(false);
    router.refresh();
  }

  const b2cByStatus = B2C_STATUS_TABS.reduce<Record<string, B2COrder[]>>((acc, status) => {
    acc[status] = visibleB2cOrders.filter((o) => o.status === status);
    return acc;
  }, {});
  const b2bProgress = b2bOrders.filter((o) => B2B_PROGRESS.includes(o.status));
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

          {deliverySummary.length > 0 && (
            <div className="mb-4 rounded-lg bg-primary-bg p-3">
              <p className="mb-1.5 text-xs font-medium text-primary-dark">
                배송해야 할 수량 (배송완료 처리마다 자동으로 줄어들어요)
              </p>
              <div className="flex flex-wrap gap-2">
                {deliverySummary.map(([name, qty]) => (
                  <span
                    key={name}
                    className="rounded-full bg-white px-3 py-1 text-xs text-primary-dark"
                  >
                    {name} {qty}판
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {B2C_STATUS_TABS.map((status) => (
              <button
                key={status}
                onClick={() => setActiveB2cStatus(status)}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-sm whitespace-nowrap ${
                  activeB2cStatus === status
                    ? "border-primary bg-primary-bg text-primary font-medium"
                    : "border-neutral-200 text-neutral-500"
                }`}
              >
                {status} {b2cByStatus[status]?.length ?? 0}
              </button>
            ))}
          </div>

          {(() => {
            const list = b2cByStatus[activeB2cStatus] ?? [];
            const isBulkable = activeB2cStatus === "입금확인완료";
            return (
              <>
                {isBulkable && list.length > 0 && (
                  <div className="mb-2 flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2">
                    <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={list.length > 0 && list.every((o) => selectedForDelivery.has(o.id))}
                        onChange={(e) => {
                          setSelectedForDelivery((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) {
                              list.forEach((o) => next.add(o.id));
                            } else {
                              list.forEach((o) => next.delete(o.id));
                            }
                            return next;
                          });
                        }}
                      />
                      전체선택 · {selectedForDelivery.size}건 선택됨
                    </label>
                    <button
                      disabled={selectedForDelivery.size === 0 || bulkPending}
                      onClick={handleBulkStart}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs text-white disabled:opacity-50"
                    >
                      {bulkPending ? "처리 중..." : "선택 일괄 배송중 처리"}
                    </button>
                  </div>
                )}
                {list.length === 0 ? (
                  <p className="py-6 text-center text-sm text-neutral-400">
                    "{activeB2cStatus}" 상태인 주문이 없어요
                  </p>
                ) : (
                  <div className="space-y-2">
                    {list.map((o) => (
                      <B2COrderCard
                        key={o.id}
                        order={o}
                        selectable={isBulkable}
                        selected={selectedForDelivery.has(o.id)}
                        onToggleSelect={() => toggleSelectForDelivery(o.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            );
          })()}
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
