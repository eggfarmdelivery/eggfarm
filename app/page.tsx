import HomeLoginButton from "@/components/HomeLoginButton";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; detail?: string }>;
}) {
  const { error, detail } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white p-6 text-center">
      <img src="/logo.png" alt="에그팜" className="h-14 w-auto" />
      <HomeLoginButton />
      {error && (
        <p className="max-w-xs rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 break-all">
          로그인 오류: {error}
          {detail ? ` (${detail})` : ""}
        </p>
      )}
    </div>
  );
}
