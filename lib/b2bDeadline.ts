import { supabase } from "@/lib/supabase";

export async function getOrderWindowStatus() {
  const { data } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", "daily_order_deadline")
    .single();

  const deadlineStr = data?.value ?? "15:00"; // HH:mm
  const now = new Date();
  const day = now.getDay(); // 0=일 6=토
  const isWeekend = day === 0 || day === 6;

  const [h, m] = deadlineStr.split(":").map(Number);
  const deadline = new Date(now);
  deadline.setHours(h, m, 0, 0);

  const isOpen = !isWeekend && now < deadline;
  const msLeft = deadline.getTime() - now.getTime();
  const minutesLeft = Math.max(0, Math.floor(msLeft / 60000));
  const hoursLeft = Math.floor(minutesLeft / 60);
  const remLabel =
    hoursLeft > 0
      ? `${hoursLeft}시간 ${minutesLeft % 60}분`
      : `${minutesLeft}분`;

  return { isOpen, isWeekend, deadlineStr, remLabel };
}
