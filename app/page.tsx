export const dynamic = "force-dynamic";

import HomeLoginButton from "@/components/HomeLoginButton";
import ZoneRequestSection from "./ZoneRequestSection";
import { getZoneRequestTotalCount } from "./zoneRequestActions";
import { supabase } from "@/lib/supabase";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; detail?: string }>;
}) {
  const { error, detail } = await searchParams;

  const [{ data: zones }, totalCount] = await Promise.all([
    supabase
      .from("delivery_zone")
      .select("name")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    getZoneRequestTotalCount(),
  ]);
  const zoneNames = (zones ?? []).map((z) => z.name);

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-white px-5 pb-24 pt-10 text-center">
      <img src="/logo.png" alt="에그팜" className="h-12 w-auto" />
      <p className="text-xs text-neutral-500">동네에서 가장 신선한 계란</p>

      {zoneNames.length > 0 && (
        <div className="w-full rounded-2xl border border-neutral-200 bg-white p-3.5 text-left">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-xs text-neutral-500">현재 배송 가능 단지 (가나다순)</p>
            <p className="text-[11px] text-neutral-400">{zoneNames.length}곳</p>
          </div>
          <ul className="max-h-40 space-y-1.5 overflow-y-auto">
            {zoneNames.map((name) => (
              <li key={name} className="flex items-center gap-2 border-b border-neutral-100 py-1 last:border-0">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-sm font-medium text-neutral-900">{name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ZoneRequestSection totalCount={totalCount} />

      <div className="flex-1" />

      <HomeLoginButton />
      {error && error !== "no_session" && (
        <p className="max-w-xs rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 break-all">
          로그인 오류: {error}
          {detail ? ` (${detail})` : ""}
        </p>
      )}
      {error === "no_session" && (
        <p className="max-w-xs rounded-md bg-primary-bg px-3 py-2 text-xs text-primary-dark">
          아래 버튼으로 카카오 로그인 후 이용해주세요
        </p>
      )}
    </div>
  );
}
