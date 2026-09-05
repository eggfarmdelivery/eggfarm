"use client";

export default function QuantityStepper({
  name,
  defaultValue = 0,
}: {
  name: string;
  defaultValue?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="number"
        name={name}
        min={0}
        defaultValue={defaultValue}
        className="w-16 rounded-md border border-neutral-200 px-2 py-1.5 text-center text-sm"
      />
    </div>
  );
}
