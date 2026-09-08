"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "./actions";
import Spinner from "@/components/Spinner";
import { byteLength, truncateToByteLimit, NICKNAME_MAX_BYTES } from "@/lib/nickname";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

type Zone = { id: string; name: string };

type Props = {
  name: string;
  phone: string;
  nickname: string;
  zones: Zone[];
  zoneId: string;
  dong: string;
  ho: string;
  entrancePassword: string;
};

export default function EditProfileClient({
  name: initialName,
  phone: initialPhone,
  nickname: initialNickname,
  zones,
  zoneId: initialZoneId,
  dong: initialDong,
  ho: initialHo,
  entrancePassword: initialEntrancePassword,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [nickname, setNickname] = useState(initialNickname);
  const [nicknameWarning, setNicknameWarning] = useState(false);
  const [zoneId, setZoneId] = useState(initialZoneId);
  const [dong, setDong] = useState(initialDong);
  const [ho, setHo] = useState(initialHo);
  const [entrancePassword, setEntrancePassword] = useState(initialEntrancePassword);

  const router = useRouter();
  const phoneTail = phone.replace(/\D/g, "").slice(-4);
  const depositorPreview = nickname && phoneTail ? `${nickname}${phoneTail}` : null;
  const zoneName = zones.find((z) => z.id === zoneId)?.name ?? "";

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
    if (ho && /^\d+$/.test(ho)) setHo(ho.padStart(4, "0"));
  }

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("phone", phone);
      formData.set("nickname", nickname);
      formData.set("delivery_zone_id", zoneId);
      formData.set("address_dong", dong);
      formData.set("address_ho", ho);
      formData.set("entrance_password", entrancePassword);
      const result = await updateProfile(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("저장 중 알 수 없는 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">회원정보</p>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-primary underline"
          >
            수정
          </button>
        </div>
        <p className="text-xs text-neutral-500 mb-1">이름</p>
        <p className="text-sm mb-3">{name || "-"}</p>
        <p className="text-xs text-neutral-500 mb-1">전화번호</p>
        <p className="text-sm mb-3">{phone || "-"}</p>
        <p className="text-xs text-neutral-500 mb-1">닉네임 (입금자명)</p>
        <p className={`text-sm ${depositorPreview ? "mb-1" : "mb-3"}`}>{nickname ? nickname : "-"}</p>
        {depositorPreview && (
          <div className="mb-3 rounded-lg bg-primary-bg px-3 py-2">
            <p className="text-xs text-primary-dark/70">입금자명</p>
            <p className="text-sm font-semibold text-primary-dark">{depositorPreview}</p>
          </div>
        )}
        <p className="text-xs text-neutral-500 mb-1">배송지</p>
        <p className="text-sm mb-3">
          {zoneName ? `${zoneName} ${dong}동 ${ho}호` : "-"}
        </p>
        <p className="text-xs text-neutral-500 mb-1">공동현관 비밀번호</p>
        <p className="text-sm mb-3">{entrancePassword || "미등록"}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <p className="text-sm font-medium">회원정보 수정</p>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">이름</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">닉네임 (입금자명으로 사용돼요)</label>
        <input
          value={nickname}
          onChange={(e) => handleNicknameChange(e.target.value)}
          placeholder="예: 홍길동맘"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm"
        />
        {nicknameWarning ? (
          <p className="mt-1 text-xs text-red-500">
            닉네임이 너무 길어요. 한글 6자(영문은 12자) 이내로 입력해주세요
          </p>
        ) : (
          <p className="mt-1 text-xs text-neutral-400">
            닉네임은 한글 6자 또는 영문 12자까지 입력할 수 있어요 (섞어서 사용 가능)
          </p>
        )}
        {depositorPreview && (
          <div className="mt-2 rounded-lg bg-primary-bg px-3 py-2">
            <p className="text-xs text-primary-dark/70">입금자명</p>
            <p className="text-sm font-semibold text-primary-dark">{depositorPreview}</p>
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">배송가능 단지</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
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
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <input
              value={dong}
              onChange={(e) => setDong(digitsOnly(e.target.value).slice(0, 4))}
              inputMode="numeric"
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
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 pr-8 text-sm"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
              호
            </span>
          </div>
        </div>
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

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setEditing(false)}
          disabled={pending}
          className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          {pending ? "저장 중..." : "저장"}
        </button>
      </div>
    </section>
  );
}
