"use client";

import { useEffect, useState } from "react";
import { listAdminStaff, addAdminStaff, removeAdminStaff, type AdminStaffRow } from "./staffActions";

export default function StaffManagement() {
  const [staff, setStaff] = useState<AdminStaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kakaoId, setKakaoId] = useState("");
  const [label, setLabel] = useState("");
  const [permission, setPermission] = useState<"payment" | "delivery" | "b2b_delivery">("payment");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const rows = await listAdminStaff();
    setStaff(rows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    setBusy(true);
    setError(null);
    const result = await addAdminStaff(kakaoId, permission, label);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setKakaoId("");
    setLabel("");
    await load();
  }

  async function handleRemove(id: string) {
    if (!confirm("이 계정의 관리자 권한을 삭제할까요?")) return;
    setBusy(true);
    const result = await removeAdminStaff(id);
    setBusy(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    await load();
  }

  return (
    <section>
      <p className="mb-1 text-sm font-medium">관리자 계정 관리</p>
      <p className="mb-3 text-xs text-neutral-400">
        입금확인/배송 담당자에게 제한된 권한만 줄 수 있어요. 담당자가 카카오로 로그인 시도하면
        나오는 본인 카카오 ID를 여기에 등록해주세요
      </p>

      <div className="mb-3 space-y-2 rounded-lg bg-neutral-50 p-3">
        <input
          value={kakaoId}
          onChange={(e) => setKakaoId(e.target.value)}
          placeholder="카카오 ID (숫자)"
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="구분용 메모 (예: 김OO님) - 선택"
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value as "payment" | "delivery" | "b2b_delivery")}
            className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm"
          >
            <option value="payment">입금확인 담당 (주문관리만)</option>
            <option value="delivery">배송 담당 (배송리스트만)</option>
            <option value="b2b_delivery">B2B 배송 담당 (B2B 배송리스트만)</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={busy || !kakaoId.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            등록
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {loading ? (
        <p className="text-xs text-neutral-400">불러오는 중...</p>
      ) : staff.length === 0 ? (
        <p className="text-xs text-neutral-400">등록된 직원 계정이 없어요</p>
      ) : (
        <div className="space-y-1.5">
          {staff.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2"
            >
              <div>
                <p className="text-sm">{s.label || "이름없음"}</p>
                <p className="text-xs text-neutral-400">
                  {s.kakao_id} ·{" "}
                  {s.permission === "payment"
                    ? "입금확인 담당"
                    : s.permission === "delivery"
                      ? "배송 담당"
                      : "B2B 배송 담당"}
                </p>
              </div>
              <button
                onClick={() => handleRemove(s.id)}
                disabled={busy}
                className="text-xs text-red-500"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
