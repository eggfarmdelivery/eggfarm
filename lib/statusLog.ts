import { supabase } from "@/lib/supabase";

export async function logStatusChange(
  table: "b2c_order" | "b2b_order",
  orderId: string,
  fromStatus: string | null,
  toStatus: string
) {
  await supabase.from("order_status_log").insert({
    order_table: table,
    order_id: orderId,
    from_status: fromStatus,
    to_status: toStatus,
  });
}
