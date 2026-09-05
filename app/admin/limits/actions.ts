"use server";

import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

export async function addLimitSchedule(formData: FormData) {
  await requireAdmin();
  const productId = formData.get("product_id") as string;
  const effectiveDate = formData.get("effective_date") as string;
  const stockLimit = Number(formData.get("stock_limit"));
  const overflowRate = Number(formData.get("overflow_rate")) / 100;
  const perPersonLimit = formData.get("per_person_limit")
    ? Number(formData.get("per_person_limit"))
    : null;

  const { error } = await supabase.from("product_limit_schedule").upsert(
    {
      product_id: productId,
      effective_date: effectiveDate,
      stock_limit: stockLimit,
      overflow_rate: overflowRate,
      per_person_limit: perPersonLimit,
    },
    { onConflict: "product_id,effective_date" }
  );
  if (error) throw new Error(error.message);
}
