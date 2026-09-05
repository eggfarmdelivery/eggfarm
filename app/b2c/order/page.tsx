export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import OrderForm from "./OrderForm";

export default async function GeneralOrderPage() {
  const { data: products } = await supabase
    .from("product")
    .select("id, name, base_price")
    .eq("is_active", true)
    .order("base_price", { ascending: false });

  const { data: zone } = await supabase
    .from("delivery_zone")
    .select("name")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return (
    <div className="pb-10">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/b2c" aria-label="뒤로가기">
          ←
        </Link>
        <h1 className="text-base font-medium">일반배송 주문</h1>
      </header>

      <OrderForm products={products ?? []} zoneName={zone?.name ?? null} />
    </div>
  );
}
