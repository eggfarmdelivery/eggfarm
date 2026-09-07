"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

export default function HomeLoginButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleKakaoLogin() {
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        setPending(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류로 로그인을 시작하지 못했어요");
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-xs">
      <button
        onClick={handleKakaoLogin}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] py-3 text-sm font-medium text-[#191600] disabled:opacity-70"
      >
        {pending && <Spinner />}
        {pending ? "이동 중..." : "카카오로 시작하기"}
      </button>
      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
