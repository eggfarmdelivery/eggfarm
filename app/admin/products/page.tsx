export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { getCurrentLimit } from "@/lib/limits";
import ProductsClient from "./ProductsClient";

export default async function ProductsPage() {
  await requireAdmin();

  const { data: products } = await supabase
    .from("product")
    .select("id, name, base_price, photo_url, is_active")
    .order("created_at", { ascending: true });

  const productsWithLimit = await Promise.all(
    (products ?? []).map(async (p) => ({
      ...p,
      current: await getCurrentLimit(p.id),
    }))
  );

  return (
    <div className="pb-10">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">상품 관리</h1>
      </header>
      <ProductsClient products={productsWithLimit} />
    </div>
  );
}
