import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-primary-bg p-6 text-center">
      <img src="/logo-mark.png" alt="에그팜" className="h-32 w-auto" />
      <p className="text-sm text-primary-dark">신선한 계란을 문 앞까지, 에그팜</p>

      <div className="w-full max-w-xs space-y-2">
        <Link
          href="/login?intent=signup"
          className="block w-full rounded-lg bg-primary py-3 text-sm font-medium text-white"
        >
          회원가입
        </Link>
        <Link
          href="/login?intent=login"
          className="block w-full rounded-lg border border-neutral-300 py-3 text-sm font-medium"
        >
          로그인
        </Link>
      </div>
    </div>
  );
}
