export const dynamic = "force-dynamic";

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";

export default async function LogsPage() {
  await requireAdmin();
  // account(name/phone)에는 RLS가 걸려있어 anon 클라이언트로는 조회가 안 되므로
  // 관리자 화면은 서비스롤 클라이언트를 사용
  const admin = createAdminClient();

  const { data: logs } = await admin
    .from("order_status_log")
    .select("id, order_table, order_id, from_status, to_status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const b2cIds = Array.from(
    new Set((logs ?? []).filter((l) => l.order_table === "b2c_order").map((l) => l.order_id))
  );
  const b2bIds = Array.from(
    new Set((logs ?? []).filter((l) => l.order_table === "b2b_order").map((l) => l.order_id))
  );

  const [{ data: b2cOrders }, { data: b2bOrders }] = await Promise.all([
    b2cIds.length
      ? admin.from("b2c_order").select("id, account(name, phone)").in("id", b2cIds)
      : Promise.resolve({ data: [] as any[] }),
    b2bIds.length
      ? admin.from("b2b_order").select("id, account(business_name)").in("id", b2bIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const b2cMap = new Map(
    (b2cOrders ?? []).map((o: any) => [o.id, o.account as { name: string | null; phone: string | null } | null])
  );
  const b2bMap = new Map(
    (b2bOrders ?? []).map((o: any) => [o.id, o.account as { business_name: string | null } | null])
  );

  function ordererLabel(log: { order_table: string; order_id: string }) {
    if (log.order_table === "b2c_order") {
      const account = b2cMap.get(log.order_id);
      if (!account) return null;
      const phoneTail = account.phone ? account.phone.replace(/\D/g, "").slice(-4) : null;
      return `${account.name ?? "이름없음"}${phoneTail ? ` · ${phoneTail}` : ""}`;
    }
    const account = b2bMap.get(log.order_id);
    if (!account) return null;
    return account.business_name ?? "거래처";
  }

  return (
    <div className="pb-10">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">상태변경 이력</h1>
      </header>

      <div className="px-5 space-y-2">
        {(logs ?? []).length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-400">이력이 없어요</p>
        )}
        {(logs ?? []).map((log) => (
          <div key={log.id} className="rounded-lg border border-neutral-200 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                {ordererLabel(log) ?? `${log.order_table === "b2c_order" ? "B2C" : "B2B"} · ${log.order_id.slice(0, 8)}`}
              </span>
              <span className="text-xs text-neutral-400">
                {new Date(log.created_at).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>
            </div>
            <p className="mt-1">
              {log.from_status ? (
                <>
                  <span className="text-neutral-400">{log.from_status}</span>
                  <span className="mx-1 text-neutral-300">→</span>
                </>
              ) : null}
              <span className="font-medium">{log.to_status}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
