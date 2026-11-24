"use client";

import { useState } from "react";
import { updateSettings } from "./actions";
import Spinner from "@/components/Spinner";

import { SettingGroup, SettingRow } from "./SettingRow";

const DAY_LABELS = [
  { value: "0", label: "일" },
  { value: "1", label: "월" },
  { value: "2", label: "화" },
  { value: "3", label: "수" },
  { value: "4", label: "목" },
  { value: "5", label: "금" },
  { value: "6", label: "토" },
];

export default function SettingsClient({ config }: { config: Record<string, string> }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const closedDaysDefault = (config.b2b_closed_days || "0,6").split(",");

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const result = await updateSettings(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch {
      setError("저장 중 알 수 없는 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  const input = "w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm";
  const lbl = "mb-1 block text-xs text-neutral-500";
  const masked = config.bank_account ? `${config.bank_name || ""} ···${config.bank_account.slice(-4)}`.trim() : "미입력";
  const closedText = DAY_LABELS.filter((d) => closedDaysDefault.includes(d.value)).map((d) => d.label).join("·") || "없음";
  const minQty = config.b2b_min_order_qty ? `${config.b2b_min_order_qty}판` : "제한없음";

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      <SettingGroup title="가게 정보">
        <SettingRow label="입금 계좌" value={masked}>
          <p className="mb-2 text-xs text-neutral-500">B2C·B2B 공통으로 쓰여요</p>
          <div className="flex flex-col gap-2">
            <div>
              <label className={lbl}>은행명</label>
              <input name="bank_name" defaultValue={config.bank_name} placeholder="예: 카카오뱅크" className={input} />
            </div>
            <div>
              <label className={lbl}>계좌번호</label>
              <input name="bank_account" defaultValue={config.bank_account} placeholder="숫자만 입력" className={input} />
            </div>
            <div>
              <label className={lbl}>예금주</label>
              <input name="bank_holder" defaultValue={config.bank_holder} className={input} />
            </div>
          </div>
        </SettingRow>

        <SettingRow
          label="홈 공지사항"
          value={config.notice_enabled === "true" ? config.notice_text || "표시중" : "꺼짐"}
        >
          <p className="mb-2 text-xs text-neutral-500">B2C·B2B 홈화면에 동일하게 노출돼요</p>
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="notice_enabled" defaultChecked={config.notice_enabled === "true"} />
            공지 표시하기
          </label>
          <textarea
            name="notice_text"
            defaultValue={config.notice_text}
            rows={3}
            placeholder="예: 9월 9일은 배송이 하루 지연될 수 있어요"
            className={input}
          />
        </SettingRow>

        <SettingRow label="카카오 오픈채팅" value={config.kakao_openchat_url ? "설정됨" : "미설정"}>
          <label className={lbl}>오픈채팅 URL</label>
          <input
            name="kakao_openchat_url"
            defaultValue={config.kakao_openchat_url}
            placeholder="https://open.kakao.com/o/..."
            className={input}
          />
          <p className="mt-1 text-xs text-neutral-500">비워두면 문의 버튼이 화면에 안 보여요</p>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="B2B 발주 규칙">
        <SettingRow
          label="마감·휴무·최소수량"
          value={`${config.b2b_order_deadline || "12:00"} · ${closedText} · ${minQty}`}
        >
          <div className="flex flex-col gap-3">
            <div>
              <label className={lbl}>발주 마감시각</label>
              <input name="b2b_order_deadline" type="time" defaultValue={config.b2b_order_deadline || "12:00"} className={input} />
            </div>
            <div>
              <span className={lbl}>발주 불가 요일</span>
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((d) => (
                  <label key={d.value} className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-2 text-sm">
                    <input
                      type="checkbox"
                      name="b2b_closed_days"
                      value={d.value}
                      defaultChecked={closedDaysDefault.includes(d.value)}
                    />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={lbl}>최소 발주수량 (판)</label>
              <input
                name="b2b_min_order_qty"
                defaultValue={config.b2b_min_order_qty}
                inputMode="numeric"
                placeholder="비워두면 제한 없음"
                className={input}
              />
            </div>
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="배송">
        <SettingRow label="출발지 주소" value={config.b2b_origin_address || "미입력"}>
          <input
            name="b2b_origin_address"
            defaultValue={config.b2b_origin_address}
            placeholder="예: 인천시 강화군 ○○면 ○○로 12"
            className={input}
          />
          <p className="mt-1 text-xs text-neutral-500">B2B 배송리스트에서 방문순서 추천·네이버지도 연결에 쓰여요</p>
        </SettingRow>
        <a href="/admin/schedule" className="flex min-h-[50px] items-center gap-2.5 border-b border-neutral-100">
          <span className="flex-1 text-[15px]">재고 부족 알림 기준</span>
          <span className="text-[13px] text-neutral-500">운영 › 배송 설정에서 변경</span>
        </a>
      </SettingGroup>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white disabled:opacity-60 ${
          justSaved ? "bg-green-600" : "bg-primary"
        }`}
      >
        {pending && <Spinner />}
        {pending ? "저장 중..." : justSaved ? "✓ 저장됨" : "위 설정 저장"}
      </button>
    </form>
  );
}
