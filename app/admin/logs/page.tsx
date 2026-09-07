export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

export default async function LogsPage() {
  await requireAdmin();

  const { data: logs } = await supabase
    .from("order_status_log")
    .select("id, order_table, order_id, from_status, to_status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

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
              <span className="text-xs text-neutral-400">
                {log.order_table === "b2c_order" ? "B2C" : "B2B"} · {log.order_id.slice(0, 8)}
              </span>
              <span className="text-xs text-neutral-400">
                {new Date(log.created_at).toLocaleString("ko-KR", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
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
