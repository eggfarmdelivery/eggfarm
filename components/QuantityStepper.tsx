"use client";

export default function QuantityStepper({
  name,
  value,
  onChange,
  min = 0,
  max,
}: {
  name: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  function dec() {
    onChange(Math.max(min, value - 1));
  }
  function inc() {
    onChange(max !== undefined ? Math.min(max, value + 1) : value + 1);
  }

  return (
    <div className="flex items-center gap-1.5">
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
        disabled={max !== undefined && value >= max}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 text-base leading-none text-neutral-600 active:bg-neutral-100 disabled:opacity-40"
        aria-label="수량 늘리기"
      >
        +
      </button>
    </div>
  );
}
