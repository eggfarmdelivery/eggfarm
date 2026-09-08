"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createZone, toggleZoneActive } from "./actions";
import Spinner from "@/components/Spinner";

type Zone = { id: string; name: string; is_active: boolean; created_at: string };

export default function ZonesClient({ zones }: { zones: Zone[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreate(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createZone(formData);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleToggle(zone: Zone) {
    setError(null);
    const result = await toggleZoneActive(zone.id, !zone.is_active);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="px-5">
      <form action={handleCreate} className="mb-5 flex gap-2">
        <input
          name="name"
          required
          placeholder="예: 래미안 루원단지"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          추가
        </button>
      </form>

      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <p className="mb-2 text-xs text-neutral-500">
        활성화된 단지만 회원가입 시 선택지로 노출돼요
      </p>
      <div className="space-y-2">
        {zones.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-400">등록된 단지가 없어요</p>
        )}
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2.5"
          >
            <span className={`text-sm ${zone.is_active ? "" : "text-neutral-400 line-through"}`}>
              {zone.name}
            </span>
            <button
              type="button"
              onClick={() => handleToggle(zone)}
              className={`rounded-md border px-3 py-1 text-xs ${
                zone.is_active
                  ? "border-primary text-primary"
                  : "border-neutral-300 text-neutral-500"
              }`}
            >
              {zone.is_active ? "활성" : "비활성"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
