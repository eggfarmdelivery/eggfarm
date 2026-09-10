"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitOnboarding } from "./actions";
import Spinner from "@/components/Spinner";
import { byteLength, truncateToByteLimit, NICKNAME_MAX_BYTES } from "@/lib/nickname";

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

const TOTAL_STEPS = 4;

export default function OnboardingClient({ zones }: { zones: Zone[] }) {
  const [role] = useState<"b2c" | "b2b">("b2c");
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nickname, setNickname] = useState("");
  const [nicknameWarning, setNicknameWarning] = useState(false);
  const [zoneId, setZoneId] = useState<string>("");
  const [dong, setDong] = useState("");
  const [ho, setHo] = useState("");
  const [entrancePassword, setEntrancePassword] = useState("");
  const router = useRouter();

  function handleNicknameChange(raw: string) {
    if (byteLength(raw) > NICKNAME_MAX_BYTES) {
      setNickname(truncateToByteLimit(raw));
      setNicknameWarning(true);
      return;
    }
    setNickname(raw);
    setNicknameWarning(false);
  }

  function handleHoBlur() {
    if (ho && /^\d+$/.test(ho)) {
      setHo(ho.padStart(4, "0"));
    }
  }

  const stepValid = [
    name.trim() !== "" && phone.replace(/\D/g, "").length >= 10,
    nickname.trim() !== "",
    zoneId !== "",
    dong.trim() !== "" && ho.trim() !== "",
  ];

  function goNext() {
    if (!stepValid[step]) return;
    if (step === TOTAL_STEPS - 1) {
      handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleSubmit() {
    const zone = zones.find((z) => z.id === zoneId);
    const paddedHo = ho && /^\d+$/.test(ho) ? ho.padStart(4, "0") : ho;
    const formData = new FormData();
    formData.set("role", role);
    formData.set("name", name);
    formData.set("phone", phone);
    formData.set("nickname", nickname);
    formData.set("delivery_zone_id", zoneId);
    formData.set("address_dong", dong);
    formData.set("address_ho", paddedHo);
    formData.set("address", `${zone?.name ?? ""} ${dong}동 ${paddedHo}호`.trim());
    formData.set("entrance_password", entrancePassword);

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

  return (
    <div>
      <div className="mb-5 flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i <= step ? "bg-primary" : "bg-neutral-200"
            }`}
          />
        ))}
      </div>

      <div key={step} className="animate-step-in">
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-base font-medium">이름과 전화번호를 알려주세요</p>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">이름</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">전화번호</label>
              <input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                type="tel"
                inputMode="numeric"
                placeholder="010-0000-0000"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-1">
            <p className="mb-3 text-base font-medium">닉네임을 정해주세요</p>
            <label className="mb-1 block text-xs text-neutral-500">
              닉네임 (입금자명으로 사용돼요)
            </label>
            <input
              value={nickname}
              onChange={(e) => handleNicknameChange(e.target.value)}
              placeholder="예: 홍길동맘"
              autoFocus
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
            />
            {nicknameWarning ? (
              <p className="mt-1 text-xs text-red-500">
                닉네임이 너무 길어요. 한글 6자(영문은 12자) 이내로 입력해주세요
              </p>
            ) : (
              <p className="mt-1 text-xs text-neutral-400">
                한글 6자 또는 영문 12자까지 입력할 수 있어요 (섞어서 사용 가능)
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-3 text-base font-medium">거주하시는 단지를 선택해주세요</p>
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
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-base font-medium">동/호수와 공동현관 비밀번호를 입력해주세요</p>
            <div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    value={dong}
                    onChange={(e) => setDong(digitsOnly(e.target.value).slice(0, 4))}
                    autoFocus
                    inputMode="numeric"
                    placeholder="101"
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
                value={entrancePassword}
                onChange={(e) => setEntrancePassword(e.target.value)}
                placeholder="예: #0000#0000 처럼 상세히 입력해주세요"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            disabled={pending}
            className="rounded-lg border border-neutral-300 px-5 py-3 text-sm"
          >
            이전
          </button>
        )}
        <button
          type="button"
          onClick={goNext}
          disabled={pending || !stepValid[step]}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          {pending
            ? "저장 중..."
            : step === TOTAL_STEPS - 1
              ? "저장하고 시작하기"
              : "다음"}
        </button>
      </div>
    </div>
  );
}
