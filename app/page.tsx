import Link from "next/link";

// 임시 랜딩: 카카오 로그인 붙기 전까지는 B2C 홈으로 바로 연결
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <img src="/logo.png" alt="에그팜" className="h-16 w-auto" />
      <p className="text-sm text-neutral-500">
        신선한 계란을 문 앞까지, 에그팜
      </p>
      <Link
        href="/b2c"
        className="rounded-lg bg-primary px-6 py-3 text-white font-medium"
      >
        시작하기
      </Link>
    </div>
  );
}
