"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "./actions";
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

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

type Props = {
  name: string;
  phone: string;
  baseAddress: string;
  dong: string;
  ho: string;
  entrancePassword: string;
};

export default function EditProfileClient({
  name: initialName,
  phone: initialPhone,
  baseAddress: initialBaseAddress,
  dong: initialDong,
  ho: initialHo,
  entrancePassword: initialEntrancePassword,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [baseAddress, setBaseAddress] = useState(initialBaseAddress);
  const [dong, setDong] = useState(initialDong);
  const [ho, setHo] = useState(initialHo);
  const [entrancePassword, setEntrancePassword] = useState(initialEntrancePassword);

  const router = useRouter();

  function openAddressSearch() {
    if (!window.daum) {
      alert("주소 검색을 불러오는 중이에요. 잠시 후 다시 시도해주세요");
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        setBaseAddress(data.roadAddress || data.jibunAddress);
      },
    }).open();
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
      formData.set("base_address", baseAddress);
      formData.set("address_dong", dong);
      formData.set("address_ho", ho);
      formData.set("entrance_password", entrancePassword);
      await updateProfile(formData);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했어요");
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
        <p className="text-xs text-neutral-500 mb-1">주소</p>
        <p className="text-sm mb-3">
          {baseAddress ? `${baseAddress} ${dong}동 ${ho}호` : "-"}
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
        <label className="mb-1 block text-xs text-neutral-500">주소</label>
        <div className="flex gap-2 mb-2">
          <input
            value={baseAddress}
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
