"use client";

import { useState } from "react";

export type BankInfo = {
  bank_name: string;
  bank_account: string;
  bank_holder: string;
};

export default function PaymentInfoModal({
  bankInfo,
  amount,
  depositorName,
  onClose,
}: {
  bankInfo: BankInfo;
  amount: number;
  depositorName?: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const hasBankInfo = bankInfo.bank_name && bankInfo.bank_account;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bankInfo.bank_account);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("복사에 실패했어요. 직접 길게 눌러서 복사해주세요");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <p className="mb-1 text-base font-medium">주문이 접수됐어요</p>
        <p className="mb-4 text-sm text-neutral-500">
          아래 계좌로 입금해주시면 확인 후 배송이 진행돼요
        </p>

        {hasBankInfo ? (
          <div className="mb-4 rounded-xl bg-primary-bg p-4">
            <p className="text-xs text-primary-dark/70 mb-1">
              {bankInfo.bank_name} · {bankInfo.bank_holder}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-lg font-medium text-primary-dark">
                {bankInfo.bank_account}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 rounded-md border border-primary-dark/20 px-3 py-1.5 text-xs text-primary-dark"
              >
                {copied ? "복사됨" : "복사"}
              </button>
            </div>
          </div>
        ) : (
          <p className="mb-4 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500">
            아직 계좌정보가 등록되지 않았어요. 별도 안내를 기다려주세요
          </p>
        )}

        <div className="mb-4 flex items-baseline justify-between rounded-lg bg-primary-bg px-3 py-2.5">
          <span className="text-sm font-medium text-primary-dark">입금 금액</span>
          <span className="text-2xl font-bold text-primary-dark">{amount.toLocaleString()}원</span>
        </div>

        {depositorName && (
          <div className="mb-4 rounded-md bg-neutral-50 px-3 py-2">
            <p className="text-xs text-neutral-500">
              입금자명에 <span className="font-medium text-neutral-700">{depositorName}</span>를
              그대로 넣어주세요
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-400">
              입금자명 = 닉네임 + 전화번호 뒷자리 4자리예요
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-white"
        >
          확인했어요
        </button>
      </div>
    </div>
  );
}
