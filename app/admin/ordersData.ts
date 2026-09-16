import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSensitive } from "@/lib/crypto";

// B2C/B2B 주문관리 화면이 분리되면서 공통으로 쓰는 데이터 조회 - 중복 방지용
export async function getB2COrdersData() {
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

  return b2cOrders;
}

export async function getB2BOrdersData() {
  const admin = createAdminClient();
  const { data: b2bOrders } = await admin
    .from("b2b_order")
    .select(
      "id, status, total_amount, created_at, desired_delivery_date, cancel_reason, account(business_name, phone, is_test), b2b_order_item(id, quantity, unit_price, adjusted, original_quantity, added_later, product(name))"
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

  return { b2bOrders: (b2bOrders as any) ?? [], b2bAccountsWithPrices };
}
