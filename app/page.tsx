import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-primary-bg p-6 text-center">
      <img src="/logo-mark.png" alt="에그팜" className="h-32 w-auto" />
      <p className="text-sm text-primary-dark">신선한 계란을 문 앞까지, 에그팜</p>

      <div className="w-full max-w-xs space-y-2">
        <p className="text-xs text-neutral-400">일반 회원(B2C)</p>
        <div className="flex gap-2">
          <Link
            href="/login?role=b2c&intent=signup"
            className="flex-1 rounded-lg bg-primary py-3 text-sm font-medium text-white"
          >
            회원가입
          </Link>
          <Link
            href="/login?role=b2c&intent=login"
            className="flex-1 rounded-lg border border-neutral-300 py-3 text-sm font-medium"
          >
            로그인
          </Link>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-2">
        <p className="text-xs text-neutral-400">거래처 회원(B2B)</p>
        <div className="flex gap-2">
          <Link
            href="/login?role=b2b&intent=signup"
            className="flex-1 rounded-lg bg-[#3D2E1A] py-3 text-sm font-medium text-white"
          >
            회원가입
          </Link>
          <Link
            href="/login?role=b2b&intent=login"
            className="flex-1 rounded-lg border border-neutral-300 py-3 text-sm font-medium"
          >
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
