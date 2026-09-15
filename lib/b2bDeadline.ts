// 발주 마감시간 고정값 - "오전 12시"라고 하신 걸 정오(낮 12시)로 해석해서 12:00으로 고정함.
// 자정(00:00)으로 하면 하루가 시작되자마자 마감 상태가 돼서 사실상 발주가 거의 불가능해지기 때문
const FIXED_DEADLINE = "12:00";

export async function getOrderWindowStatus() {
  const now = new Date();
  const day = now.getDay(); // 0=일 6=토
  const isWeekend = day === 0 || day === 6;

  const [h, m] = FIXED_DEADLINE.split(":").map(Number);
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

  return { isOpen, isWeekend, deadlineStr: FIXED_DEADLINE, remLabel };
}

// 마감 이후(평일 낮 12시 지남) 또는 주말에 들어온 주문은 그 다음 영업일로 자동 배정함
// (금요일 마감 이후/주말 접수분은 월요일로 감 - 토·일 건너뜀)
export function getNextBusinessDayFrom(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}
