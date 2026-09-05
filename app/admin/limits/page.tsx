export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { getCurrentLimit } from "@/lib/limits";
import LimitForm from "./LimitForm";

export default async function LimitsPage() {
  await requireAdmin();

  const { data: products } = await supabase
    .from("product")
    .select("id, name")
    .eq("is_active", true);

  const productsWithLimit = await Promise.all(
    (products ?? []).map(async (p) => ({
      ...p,
      current: await getCurrentLimit(p.id),
    }))
  );

  return (
    <div className="pb-10">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">상품별 주문 한도 설정</h1>
      </header>

      <main className="px-5 space-y-4">
        {productsWithLimit.map((p) => (
          <div key={p.id} className="rounded-xl border border-neutral-200 p-4">
            <p className="text-sm font-medium mb-3">{p.name}</p>
            <LimitForm productId={p.id} current={p.current} />
          </div>
        ))}
      </main>
    </div>
  );
}
