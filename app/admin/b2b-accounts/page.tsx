export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSensitive } from "@/lib/crypto";
import B2BAccountsClient from "./B2BAccountsClient";

export default async function B2BAccountsPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: accounts } = await admin
    .from("account")
    .select(
      "id, business_name, business_number, business_type, name, phone, address, entrance_password, approval_status, rejection_reason, admin_note, tax_invoice_needed, created_at"
    )
    .eq("role", "b2b")
    .order("created_at", { ascending: false });

  const { data: paidOrders } = await admin
    .from("b2b_order")
    .select("account_id, total_amount")
    .eq("status", "입금확인완료");

  const revenueMap = new Map<string, number>();
  for (const o of paidOrders ?? []) {
    revenueMap.set(o.account_id, (revenueMap.get(o.account_id) ?? 0) + o.total_amount);
  }

  const rows = (accounts ?? []).map((a) => ({
    ...a,
    entrance_password: decryptSensitive(a.entrance_password) || null,
    cumulative_revenue: revenueMap.get(a.id) ?? 0,
  }));

  return (
    <div className="pb-24">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin/operations" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">거래처 관리</h1>
      </header>

      <B2BAccountsClient accounts={rows as any} />
    </div>
  );
}
