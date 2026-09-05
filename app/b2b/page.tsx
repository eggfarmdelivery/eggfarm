import Link from "next/link";

// TODO: 카카오 로그인 연동 붙이기 전까지는 데모 계정으로 바로 진입
export default function B2BLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-primary-bg p-6 text-center">
      <img src="/logo.png" alt="에그팜" className="h-8 w-auto" />
      <p className="text-sm text-primary-dark">거래처 발주 시스템</p>
      <Link
        href="/b2b/order"
        className="rounded-lg bg-[#3D2E1A] px-6 py-3 text-white font-medium"
      >
        카카오로 로그인 (테스트용 바로 진입)
      </Link>
    </div>
  );
}
