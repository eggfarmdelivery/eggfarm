export const dynamic = "force-dynamic";

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";
import { decryptSensitive } from "@/lib/crypto";
import ConsoleClient from "../ConsoleClient";

export default async function AdminOrdersPage() {
  await requireAdmin();
  // 관리자는 일반 로그인 사용자가 아니라 RLS(auth.uid())를 못 타므로,
  // 회원 이름/전화번호처럼 RLS가 걸린 정보를 보려면 서비스롤 클라이언트가 필요함
  const admin = createAdminClient();

  const { data: b2cOrdersRaw } = await admin
    .from("b2c_order")
    .select(
      "id, order_type, status, is_overflow, total_amount, created_at, campaign_id, campaign(title), account(name, phone, nickname, address, entrance_password, is_test), b2c_order_item(quantity, product(name)), refund_bank_name, refund_account_number, refund_holder_name"
    )
    .order("created_at", { ascending: false });

  // entrance_password는 저장할 때 암호화돼있어서 화면에 보여주려면 복호화가 필요함
  const b2cOrders = (b2cOrdersRaw ?? []).map((o: any) => ({
    ...o,
    account: o.account
      ? { ...o.account, entrance_password: decryptSensitive(o.account.entrance_password) || null }
      : null,
  }));

  const { data: b2bOrders } = await admin
    .from("b2b_order")
    .select(
      "id, status, total_amount, created_at, desired_delivery_date, account(business_name, phone, is_test), b2b_order_item(id, quantity, unit_price, adjusted, original_quantity, product(name))"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="pb-24">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin/operations" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">주문관리</h1>
      </header>

      <ConsoleClient
        b2cOrders={(b2cOrders as any) ?? []}
        b2bOrders={(b2bOrders as any) ?? []}
      />
    </div>
  );
}
