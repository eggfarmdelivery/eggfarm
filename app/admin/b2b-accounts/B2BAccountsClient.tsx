"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveB2BAccount,
  rejectB2BAccount,
  setB2BAccountStatus,
  updateB2BAccountNote,
  toggleTaxInvoiceNeeded,
  setB2BAccountPrices,
} from "./actions";

type Product = { id: string; name: string; base_price: number };

type Account = {
  id: string;
  business_name: string | null;
  business_number: string | null;
  business_type: string | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  entrance_password: string | null;
  approval_status: string;
  rejection_reason: string | null;
  admin_note: string | null;
  tax_invoice_needed: boolean;
  cumulative_revenue: number;
  created_at: string;
  prices: Record<string, number>;
};

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  pending: { text: "승인대기", className: "bg-yellow-50 text-yellow-700" },
  approved: { text: "승인", className: "bg-green-50 text-green-700" },
  rejected: { text: "거절", className: "bg-red-50 text-red-600" },
  inactive: { text: "비활성", className: "bg-neutral-100 text-neutral-500" },
};

function RejectModal({
  onClose,
  onConfirm,
  busy,
}: {
  onClose: () => void;
  onConfirm: (reason: string) => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <p className="mb-3 text-base font-medium">거절 사유를 입력해주세요</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="예: 배송 가능 지역이 아니에요"
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm text-neutral-600"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={busy || !reason.trim()}
            className="flex-1 rounded-lg bg-red-500 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "처리 중..." : "거절 확정"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductPricesModal({
  account,
  products,
  onClose,
  busy,
  run,
}: {
  account: Account;
  products: Product[];
  onClose: () => void;
  busy: boolean;
  run: (fn: () => Promise<{ success: boolean; error?: string }>) => Promise<void>;
}) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(products.map((p) => [p.id, account.prices[p.id] != null]))
  );
  const [prices, setPrices] = useState<Record<string, number>>(
    Object.fromEntries(products.map((p) => [p.id, account.prices[p.id] ?? p.base_price]))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <p className="mb-1 text-base font-medium">취급 상품 / 단가 설정</p>
        <p className="mb-3 text-xs text-neutral-400">
          체크한 상품만 이 거래처 발주 화면에 보여요
        </p>
        <div className="mb-4 space-y-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={enabled[p.id] ?? false}
                  onChange={(e) => setEnabled((prev) => ({ ...prev, [p.id]: e.target.checked }))}
                />
                {p.name}
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  disabled={!enabled[p.id]}
                  value={prices[p.id] ?? p.base_price}
                  onChange={(e) => setPrices((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                  className="w-20 rounded-md border border-neutral-200 px-2 py-1.5 text-right text-sm disabled:opacity-40"
                />
                <span className="text-xs text-neutral-400">원</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-lg border border-neutral-200 py-3 text-sm text-neutral-600"
          >
            취소
          </button>
          <button
            disabled={busy}
            onClick={() =>
              run(() =>
                setB2BAccountPrices(
                  account.id,
                  products.map((p) => ({
                    productId: p.id,
                    enabled: enabled[p.id] ?? false,
                    price: prices[p.id] ?? p.base_price,
                  }))
                )
              ).then(onClose)
            }
            className="flex-1 rounded-lg bg-primary py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountCard({ account, products }: { account: Account; products: Product[] }) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [settingPrices, setSettingPrices] = useState(false);
  const [note, setNote] = useState(account.admin_note ?? "");
  const router = useRouter();

  async function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(true);
    const result = await fn();
    setBusy(false);
    if (!result.success) {
      alert(result.error ?? "처리 중 오류가 발생했어요");
      return;
    }
    router.refresh();
  }

  const status = STATUS_LABEL[account.approval_status] ?? STATUS_LABEL.pending;

  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium">{account.business_name ?? "이름없음"}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${status.className}`}>{status.text}</span>
      </div>
      <p className="mb-1 text-xs text-neutral-500">
        {account.business_type ?? "-"} · {account.business_number ?? "-"}
      </p>
      <p className="mb-1 text-xs text-neutral-500">
        {account.name} · {account.phone}
      </p>
      {account.address && <p className="mb-1 text-xs text-blue-700">📍 {account.address}</p>}
      {account.entrance_password && (
        <p className="mb-1 text-xs text-blue-700">🔑 {account.entrance_password}</p>
      )}
      {account.approval_status === "approved" && (
        <p className="mb-1 text-xs text-neutral-400">
          누적 거래액 {account.cumulative_revenue.toLocaleString()}원
        </p>
      )}      {account.rejection_reason && (
        <p className="mb-1 text-xs text-red-500">거절사유: {account.rejection_reason}</p>
      )}

      <label className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
        <input
          type="checkbox"
          checked={account.tax_invoice_needed}
          disabled={busy}
          onChange={(e) => run(() => toggleTaxInvoiceNeeded(account.id, e.target.checked))}
        />
        세금계산서 발행 희망
      </label>

      {editingNote ? (
        <div className="mt-2 flex gap-1.5">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="메모 (예: 오전 배송만 가능)"
            className="flex-1 rounded-md border border-neutral-200 px-2 py-1.5 text-xs"
          />
          <button
            disabled={busy}
            onClick={() => run(() => updateB2BAccountNote(account.id, note)).then(() => setEditingNote(false))}
            className="rounded-md bg-primary px-2.5 py-1.5 text-xs text-white"
          >
            저장
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditingNote(true)}
          className="mt-2 text-left text-xs text-neutral-400 underline"
        >
          {account.admin_note ? `메모: ${account.admin_note}` : "메모 추가"}
        </button>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {account.approval_status === "pending" && (
          <>
            <button
              disabled={busy}
              onClick={() => run(() => approveB2BAccount(account.id))}
              className="rounded-md bg-primary px-3 py-1.5 text-xs text-white"
            >
              승인
            </button>
            <button
              disabled={busy}
              onClick={() => setRejecting(true)}
              className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-500"
            >
              거절
            </button>
          </>
        )}
        {account.approval_status === "approved" && (
          <>
            <button
              disabled={busy}
              onClick={() => setSettingPrices(true)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600"
            >
              취급 상품 설정
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (confirm("이 거래처를 비활성화(거래 중단)할까요?")) run(() => setB2BAccountStatus(account.id, "inactive"));
              }}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-500"
            >
              비활성화
            </button>
          </>
        )}
        {(account.approval_status === "inactive" || account.approval_status === "rejected") && (
          <button
            disabled={busy}
            onClick={() => run(() => setB2BAccountStatus(account.id, "approved"))}
            className="rounded-md bg-primary px-3 py-1.5 text-xs text-white"
          >
            승인으로 전환
          </button>
        )}
      </div>

      {rejecting && (
        <RejectModal
          busy={busy}
          onClose={() => setRejecting(false)}
          onConfirm={(reason) => run(() => rejectB2BAccount(account.id, reason)).then(() => setRejecting(false))}
        />
      )}

      {settingPrices && (
        <ProductPricesModal
          account={account}
          products={products}
          busy={busy}
          run={run}
          onClose={() => setSettingPrices(false)}
        />
      )}
    </div>
  );
}

export default function B2BAccountsClient({ accounts, products }: { accounts: Account[]; products: Product[] }) {
  const [tab, setTab] = useState<"pending" | "all">(
    accounts.some((a) => a.approval_status === "pending") ? "pending" : "all"
  );

  const pending = accounts.filter((a) => a.approval_status === "pending");
  const list = tab === "pending" ? pending : accounts;

  return (
    <div className="px-5">
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setTab("pending")}
          className={`rounded-full px-3 py-1.5 text-xs ${
            tab === "pending" ? "bg-primary text-white" : "bg-neutral-100 text-neutral-500"
          }`}
        >
          승인대기 {pending.length > 0 && `(${pending.length})`}
        </button>
        <button
          onClick={() => setTab("all")}
          className={`rounded-full px-3 py-1.5 text-xs ${
            tab === "all" ? "bg-primary text-white" : "bg-neutral-100 text-neutral-500"
          }`}
        >
          전체 거래처 ({accounts.length})
        </button>
      </div>

      {list.length === 0 && (
        <p className="py-10 text-center text-sm text-neutral-400">표시할 거래처가 없어요</p>
      )}

      <div className="space-y-2">
        {list.map((a) => (
          <AccountCard key={a.id} account={a} products={products} />
        ))}
      </div>
    </div>
  );
}
