import LoginClient from "./LoginClient";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; intent?: string; error?: string }>;
}) {
  const { role, intent, error } = await searchParams;
  const safeRole = role === "b2b" ? "b2b" : "b2c";
  const safeIntent = intent === "login" ? "login" : "signup";

  const errorMessage: Record<string, string> = {
    no_account: "아직 가입하지 않은 계정이에요. 회원가입을 먼저 진행해주세요",
    already_registered: "이미 가입된 계정이에요. 로그인으로 진행할게요",
    auth_failed: "로그인 중 오류가 발생했어요. 다시 시도해주세요",
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <img src="/logo.png" alt="에그팜" className="mb-8 h-14" />
      <p className="mb-2 text-sm text-neutral-500">
        {safeRole === "b2b" ? "거래처 " : ""}
        {safeIntent === "signup" ? "회원가입" : "로그인"}
      </p>
      {error && errorMessage[error] && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {errorMessage[error]}
        </p>
      )}
      <LoginClient role={safeRole} intent={safeIntent} />
    </div>
  );
}
