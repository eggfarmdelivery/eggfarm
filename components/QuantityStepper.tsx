"use client";

import { useRef, useState } from "react";

export default function QuantityStepper({
  name,
  value,
  onChange,
  min = 0,
  max,
  limitMessage,
}: {
  name: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  limitMessage?: string;
}) {
  const [shake, setShake] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerLimitFeedback() {
    setShake(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShake(false), 1600);
  }

  function dec() {
    onChange(Math.max(min, value - 1));
  }
  function inc() {
    if (max !== undefined && value >= max) {
      triggerLimitFeedback();
      return;
    }
    onChange(max !== undefined ? Math.min(max, value + 1) : value + 1);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className={`flex items-center gap-1.5 ${shake ? "animate-shake" : ""}`}>
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 text-base leading-none text-neutral-600 active:bg-neutral-100 disabled:opacity-40"
          aria-label="수량 줄이기"
        >
          −
        </button>
        <input
          type="number"
          name={name}
          value={value}
          readOnly
          className="w-10 rounded-md border border-neutral-200 py-1.5 text-center text-sm"
        />
        <button
          type="button"
          onClick={inc}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 text-base leading-none text-neutral-600 active:bg-neutral-100"
          aria-label="수량 늘리기"
        >
          +
        </button>
      </div>
      {shake && (
        <p className="text-[11px] text-red-500">
          {limitMessage ?? `최대 ${max}개까지만 가능해요`}
        </p>
      )}
    </div>
  );
}
