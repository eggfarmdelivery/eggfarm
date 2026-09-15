// 발주 마감시간 고정값 - "오전 12시"라고 하신 걸 정오(낮 12시)로 해석해서 12:00으로 고정함.
// 자정(00:00)으로 하면 하루가 시작되자마자 마감 상태가 돼서 사실상 발주가 거의 불가능해지기 때문
const FIXED_DEADLINE = "12:00";

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
