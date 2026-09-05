"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "./actions";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await adminLogin(formData);
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인 실패");
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="w-full max-w-xs space-y-3">
      <input
        type="password"
        name="password"
        placeholder="관리자 비밀번호"
        className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary py-3 text-white font-medium disabled:opacity-50"
      >
        {pending ? "확인 중..." : "로그인"}
      </button>
    </form>
  );
}
