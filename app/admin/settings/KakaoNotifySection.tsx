"use client";

import { useState } from "react";
import { testKakaoNotify } from "./actions";

export default function KakaoNotifySection({
  connected,
  justConnected,
  error,
}: {
  connected: boolean;
  justConnected: boolean;
  error?: string;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testKakaoNotify();
      if (result.success) {
        setTestResult({ ok: true, message: "테스트 메시지를 보냈어요. 카톡을 확인해보세요" });
      } else {
        setTestResult({ ok: false, message: result.error });
      }
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="mt-8 border-t border-neutral-200 pt-6">
      <p className="mb-1 text-sm font-medium">새 주문 카카오 알림 (나에게 보내기)</p>
      <p className="mb-3 text-xs text-neutral-400">
        연동해두면 새 주문이 들어올 때마다 관리자 본인 카톡으로 알림이 와요
      </p>

      {justConnected && (
        <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          카카오 연동이 완료됐어요
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          연동 중 오류가 발생했어요: {error}
        </p>
      )}

      {connected ? (
        <>
          <p className="mb-2 rounded-md bg-primary-bg px-3 py-2 text-sm text-primary-dark">
            연동됨 - 새 주문이 오면 카톡으로 알려드려요
          </p>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="w-full rounded-lg border border-neutral-300 py-2.5 text-sm disabled:opacity-60"
          >
            {testing ? "발송 중..." : "테스트 발송"}
          </button>
          {testResult && (
            <p
              className={`mt-2 whitespace-pre-wrap break-all rounded-md px-3 py-2 text-xs ${
                testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
              }`}
            >
              {testResult.message}
            </p>
          )}
        </>
      ) : (
        <a
          href="/api/kakao/connect"
          className="flex w-full items-center justify-center rounded-lg bg-[#FEE500] py-2.5 text-sm font-medium text-[#191600]"
        >
          카카오 나에게 보내기 연동하기
        </a>
      )}
    </section>
  );
}
