export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { getApprovedB2BAccountId } from "@/lib/getAccount";
import { getOrderWindowStatus } from "@/lib/b2bDeadline";
import { getConfig } from "@/lib/settings";
import OrderForm from "./OrderForm";

export default async function B2BOrderPage() {
  const accountId = await getApprovedB2BAccountId();
  const window = await getOrderWindowStatus();
  const minOrderAmountRaw = await getConfig("b2b_min_order_amount");
  const minOrderAmount = Number(minOrderAmountRaw) || 0;

  const { data: products } = await supabase
    .from("product")
    .select("id, name, base_price")
    .eq("is_active", true)
    .order("base_price", { ascending: false });

  const { data: contractPrices } = await supabase
    .from("b2b_account_price")
    .select("product_id, price")
    .eq("account_id", accountId);
  const priceMap = new Map(
    (contractPrices ?? []).map((r) => [r.product_id, r.price])
  );

  const productsWithPrice = (products ?? [])
    .filter((p) => priceMap.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: priceMap.get(p.id)!,
    }));

  return (
    <div className="pb-10">
      <header className="flex items-center justify-between px-5 py-4">
        <h1 className="text-base font-medium">거래처 발주</h1>
        <span
          className={`text-xs px-2.5 py-1 rounded-full ${
            window.isOpen
              ? "bg-yellow-50 text-yellow-700"
              : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {window.isWeekend
            ? "주말 마감"
            : window.isOpen
            ? `마감 ${window.remLabel} 전`
            : "오늘 발주 마감"}
        </span>
      </header>

      <OrderForm products={productsWithPrice} minOrderAmount={minOrderAmount} />

      {productsWithPrice.length === 0 && (
        <p className="mx-5 mt-4 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
          아직 발주 가능한 상품이 등록되지 않았어요. 에그팜으로 문의해주세요
        </p>
      )}
    </div>
  );
}
