import HomeLoginButton from "@/components/HomeLoginButton";
import { supabase } from "@/lib/supabase";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; detail?: string }>;
}) {
  const { error, detail } = await searchParams;

  const { data: zones } = await supabase
    .from("delivery_zone")
    .select("name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  const zoneNames = (zones ?? []).map((z) => z.name);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white p-6 text-center">
      <img src="/logo.png" alt="에그팜" className="h-14 w-auto" />
      {zoneNames.length > 0 && (
        <p className="max-w-xs text-sm text-neutral-600">
          지금은{" "}
          <span className="font-bold text-neutral-900 bg-primary-bg px-1 rounded">
            {zoneNames.join(", ")}
          </span>
          만 이용 가능해요
        </p>
      )}
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
