export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ kakao_error?: string; kakao_setup_id?: string }>;
}) {
  const { kakao_error, kakao_setup_id } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-lg font-medium">관리자 콘솔</h1>

      {kakao_setup_id && (
        <div className="w-full max-w-xs rounded-md bg-amber-50 px-3 py-3 text-xs text-amber-800">
          <p className="mb-1 font-medium">최초 설정이 필요해요</p>
          <p className="mb-2">
            Vercel 환경변수에 <code className="font-mono">ADMIN_KAKAO_ID</code>를 아래 값으로
            추가하고 재배포해주세요:
          </p>
          <p className="select-all break-all rounded bg-white px-2 py-1 font-mono">
            {kakao_setup_id}
          </p>
        </div>
      )}
      {kakao_error && (
        <p className="w-full max-w-xs rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {kakao_error}
        </p>
      )}

      <a
        href="/api/kakao/connect"
        className="flex w-full max-w-xs items-center justify-center rounded-lg bg-[#FEE500] py-3 text-sm font-medium text-[#191600]"
      >
        카카오로 로그인
      </a>
    </div>
  );
}
