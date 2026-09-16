import { supabase } from "@/lib/supabase";

// Vercel 서버는 UTC로 돌아서 new Date()의 getHours()/getDay()가 한국시간이 아니라 UTC 기준으로
// 나옴(9시간 차이) - 그래서 "평일 낮 12시"를 그냥 new Date()로 비교하면 실제 한국시간 기준
// 마감시간이 어긋나는 문제가 있었음. 항상 이 함수로 한국시간 기준 Date를 만들어서 사용함
function nowInSeoul(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

export function getSeoulNow(): Date {
  return nowInSeoul();
}

export async function getOrderWindowStatus() {
  const now = nowInSeoul();
  const day = now.getDay(); // 0=일 ... 6=토

  const { data } = await supabase
    .from("system_config")
    .select("key, value")
    .in("key", ["b2b_order_deadline", "b2b_closed_days"]);
  const config = Object.fromEntries((data ?? []).map((c) => [c.key, c.value]));

  const deadlineStr = config.b2b_order_deadline || "12:00";
  const closedDays = (config.b2b_closed_days || "0,6")
    .split(",")
    .map((s: string) => Number(s.trim()))
    .filter((n: number) => !Number.isNaN(n));

  const isClosedDay = closedDays.includes(day);

  const [h, m] = deadlineStr.split(":").map(Number);
  const deadline = new Date(now);
  deadline.setHours(h, m, 0, 0);

  const isOpen = !isClosedDay && now < deadline;
  const msLeft = deadline.getTime() - now.getTime();
  const minutesLeft = Math.max(0, Math.floor(msLeft / 60000));
  const hoursLeft = Math.floor(minutesLeft / 60);
  const remLabel =
    hoursLeft > 0
      ? `${hoursLeft}시간 ${minutesLeft % 60}분`
      : `${minutesLeft}분`;

  return { isOpen, isWeekend: isClosedDay, deadlineStr, remLabel };
}

// 마감 이후 또는 휴무 요일에 들어온 주문은 그 다음 영업일로 자동 배정함(휴무 요일은 건너뜀)
export async function getNextBusinessDayFrom(date: Date): Promise<string> {
  const { data } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", "b2b_closed_days")
    .single();
  const closedDays = (data?.value || "0,6")
    .split(",")
    .map((s: string) => Number(s.trim()))
    .filter((n: number) => !Number.isNaN(n));

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  while (closedDays.includes(d.getDay())) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}
