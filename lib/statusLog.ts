import { supabase } from "@/lib/supabase";

export async function logStatusChange(
  table: "b2c_order" | "b2b_order",
  orderId: string,
  fromStatus: string | null,
  toStatus: string
) {
  const { error } = await supabase.from("order_status_log").insert({
    order_table: table,
    order_id: orderId,
    from_status: fromStatus,
    to_status: toStatus,
  });
  // 임시: 이력 저장 실패 원인을 진단하기 위해 에러를 그대로 드러냄
  // (원인 확인되면 다시 조용히 무시하도록 되돌릴 예정)
  if (error) throw new Error(`이력 저장 실패: ${error.message}`);
}
