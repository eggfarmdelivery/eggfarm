import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-primary-bg p-6 text-center">
      <img src="/logo-mark.png" alt="에그팜" className="h-40 w-auto" />
      <p className="text-sm text-primary-dark">
        신선한 계란을 문 앞까지, 에그팜
      </p>
      <Link
        href="/login?role=b2c"
        className="rounded-lg bg-primary px-8 py-3 text-white font-medium shadow-sm"
      >
        시작하기
      </Link>
      <Link href="/login?role=b2b" className="text-xs text-neutral-400 underline">
        거래처 로그인
      </Link>
    </div>
  );
}
