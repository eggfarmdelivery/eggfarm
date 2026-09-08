"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createZone, toggleZoneActive, deleteZone } from "./actions";
import Spinner from "@/components/Spinner";

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: { roadAddress: string; jibunAddress: string }) => void;
      }) => { open: () => void };
    };
  }
}

type Zone = { id: string; name: string; address: string | null; is_active: boolean; created_at: string };

export default function ZonesClient({ zones }: { zones: Zone[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const router = useRouter();

  function openAddressSearch() {
    if (!window.daum) {
      alert("주소 검색을 불러오는 중이에요. 잠시 후 다시 시도해주세요");
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        setAddress(data.roadAddress || data.jibunAddress);
      },
    }).open();
  }

  async function handleCreate(formData: FormData) {
    setPending(true);
    setError(null);
    formData.set("name", name);
    formData.set("address", address);
    const result = await createZone(formData);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setName("");
    setAddress("");
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

  async function handleDelete(zone: Zone) {
    if (!confirm(`"${zone.name}" 단지를 삭제할까요? 되돌릴 수 없어요`)) return;
    setError(null);
    const result = await deleteZone(zone.id);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="px-5">
      <form action={handleCreate} className="mb-5 space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="단지명 (예: 래미안 루원단지)"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
        <div className="flex gap-2">
          <input
            value={address}
            readOnly
            placeholder="주소 검색을 눌러주세요"
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={openAddressSearch}
            className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2.5 text-sm whitespace-nowrap"
          >
            주소 검색
          </button>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          단지 추가
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
            <span className={zone.is_active ? "" : "text-neutral-400 line-through"}>
              <span className="text-sm">{zone.name}</span>
              {zone.address && (
                <span className="block text-xs text-neutral-400">{zone.address}</span>
              )}
            </span>
            <div className="flex shrink-0 gap-1.5">
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
              <button
                type="button"
                onClick={() => handleDelete(zone)}
                className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-500"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
