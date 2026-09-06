import LoginClient from "./LoginClient";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const safeRole = role === "b2b" ? "b2b" : "b2c";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <img src="/logo.png" alt="에그팜" className="mb-8 h-14" />
      <p className="mb-8 text-sm text-neutral-500">
        {safeRole === "b2b" ? "거래처 로그인" : "간편하게 카카오로 시작하세요"}
      </p>
      <LoginClient role={safeRole} />
    </div>
  );
}
