export const dynamic = "force-dynamic";

import Link from "next/link";
import { Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/adminAuth";
import { decryptSensitive } from "@/lib/crypto";
import ConsoleClient from "../ConsoleClient";

export default async function AdminOrdersPage() {
  const role = await requirePermission(["payment"]);
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

  // 마감시간 이후 등 임의로 대신 발주 등록할 때 쓸, 승인된 거래처 + 취급상품/단가 목록
  const { data: approvedB2BAccountsRaw } = await admin
    .from("account")
    .select("id, business_name")
    .eq("role", "b2b")
    .eq("approval_status", "approved")
    .order("business_name", { ascending: true });

  const { data: allB2BPrices } = await admin
    .from("b2b_account_price")
    .select("account_id, product_id, price, product(name)");

  const b2bAccountsWithPrices = (approvedB2BAccountsRaw ?? []).map((acc) => ({
    id: acc.id,
    businessName: acc.business_name ?? "이름없음",
    products: (allB2BPrices ?? [])
      .filter((p) => p.account_id === acc.id)
      .map((p) => ({
        productId: p.product_id,
        productName: (p.product as any)?.name ?? "상품",
        price: p.price,
      })),
  }));

  return (
    <div className="pb-24">
      <header className="flex items-center gap-2 px-5 py-4">
        {role === "owner" && (
          <Link href="/admin/operations" aria-label="뒤로가기" className="text-lg">
            ←
          </Link>
        )}
        <h1 className="flex-1 text-base font-medium">주문관리</h1>
        <Link
          href="/admin/members"
          className="flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600"
        >
          <Users size={14} />
          회원 조회
        </Link>
      </header>

      <ConsoleClient
        b2cOrders={(b2cOrders as any) ?? []}
        b2bOrders={(b2bOrders as any) ?? []}
        b2bAccountsWithPrices={b2bAccountsWithPrices}
      />
    </div>
  );
}
