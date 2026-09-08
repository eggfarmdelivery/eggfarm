"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitOnboarding } from "./actions";
import Spinner from "@/components/Spinner";

type Zone = { id: string; name: string };

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export default function OnboardingClient({ zones }: { zones: Zone[] }) {
  const [role] = useState<"b2c" | "b2b">("b2c");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [zoneId, setZoneId] = useState<string>("");
  const [dong, setDong] = useState("");
  const [ho, setHo] = useState("");
  const router = useRouter();

  function handleHoBlur() {
    if (ho && /^\d+$/.test(ho)) {
      setHo(ho.padStart(4, "0"));
    }
  }

  async function handleSubmit(formData: FormData) {
    const zone = zones.find((z) => z.id === zoneId);
    formData.set("role", role);
    formData.set("phone", phone);
    const paddedHo = ho && /^\d+$/.test(ho) ? ho.padStart(4, "0") : ho;
    formData.set("delivery_zone_id", zoneId);
    formData.set("address_dong", dong);
    formData.set("address_ho", paddedHo);
    formData.set("address", `${zone?.name ?? ""} ${dong}동 ${paddedHo}호`.trim());
    setPending(true);
    setError(null);
    try {
      const result = await submitOnboarding(formData);
      if (!result.success) {
        setError(result.error);
        setPending(false);
        return;
      }
      router.push(`/${role}`);
    } catch {
      setError("저장 중 알 수 없는 오류가 발생했어요");
      setPending(false);
    }
  }

  const canSubmit = zoneId && dong && ho;

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-neutral-500">이름</label>
        <input
          name="name"
          required
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">전화번호</label>
        <input
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          required
          type="tel"
          inputMode="numeric"
          placeholder="010-0000-0000"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">배송가능 단지</label>
        {zones.length === 0 ? (
          <p className="rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
            현재 등록된 배송가능 단지가 없어요. 잠시 후 다시 시도해주세요
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {zones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                onClick={() => setZoneId(zone.id)}
                className={`rounded-lg border py-2.5 text-sm ${
                  zoneId === zone.id
                    ? "border-primary bg-primary-bg text-primary"
                    : "border-neutral-200 text-neutral-600"
                }`}
              >
                {zone.name}
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="relative">
            <input
              value={dong}
              onChange={(e) => setDong(digitsOnly(e.target.value).slice(0, 4))}
              required
              inputMode="numeric"
              placeholder="0"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 pr-8 text-sm"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
              동
            </span>
          </div>
          <div className="relative">
            <input
              value={ho}
              onChange={(e) => setHo(digitsOnly(e.target.value).slice(0, 4))}
              onBlur={handleHoBlur}
              required
              inputMode="numeric"
              placeholder="0000"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 pr-8 text-sm"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
              호
            </span>
          </div>
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          호수는 4자리로 자동 변환돼요 (예: 803 → 0803)
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">
          공동현관 비밀번호 <span className="text-neutral-400">(선택)</span>
        </label>
        <input
          name="entrance_password"
          placeholder="예: #0000#0000 처럼 상세히 입력해주세요"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending || !canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending && <Spinner />}
        {pending ? "저장 중..." : "저장하고 시작하기"}
      </button>
    </form>
  );
}
