"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginClient({ intent }: { intent: "signup" | "login" }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleKakaoLogin() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?intent=${intent}`,
      },
    });
    if (error) {
      setError(error.message);
      setPending(false);
    }
    // 성공 시 카카오 로그인 페이지로 리다이렉트되므로 이후 처리는 /auth/callback에서
  }

  return (
    <div className="w-full max-w-xs">
      <button
        onClick={handleKakaoLogin}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] py-3 text-sm font-medium text-[#191600] disabled:opacity-50"
      >
        카카오로 {intent === "signup" ? "회원가입" : "로그인"}
      </button>
      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
