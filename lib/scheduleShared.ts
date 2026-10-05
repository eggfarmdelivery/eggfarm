// 배송 요일/마감 시각 계산 - 순수 함수만 있어서 서버/클라이언트 어디서든 import 가능
// 모든 계산은 한국 시간(KST, UTC+9) 기준

export type ScheduleConfig = {
  weekdays: number[]; // 0=일 ... 6=토
  cutoff: string; // "17:00"
  start: string; // "18:00"
  fee: number;
  freeMinQty: number;
  perPersonLimit: number; // 0이면 제한 없음
  lowThreshold: number;
};

export const SCHEDULE_KEYS = [
  "delivery_weekdays",
  "order_cutoff_time",
  "delivery_start_time",
  "delivery_fee",
  "free_shipping_min_qty",
  "per_person_limit",
  "low_stock_alert_threshold",
];

const KST_MS = 9 * 60 * 60 * 1000;
export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function parseSchedule(cfg: Record<string, string>): ScheduleConfig {
  const weekdays = (cfg.delivery_weekdays || "2,4,6")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const num = (v: string | undefined, d: number) => {
    const n = Number(v);
    return v !== undefined && v !== "" && Number.isFinite(n) ? n : d;
  };
  return {
    weekdays: weekdays.length > 0 ? Array.from(new Set(weekdays)).sort() : [2, 4, 6],
    cutoff: /^\d{1,2}:\d{2}$/.test(cfg.order_cutoff_time ?? "") ? cfg.order_cutoff_time : "17:00",
    start: /^\d{1,2}:\d{2}$/.test(cfg.delivery_start_time ?? "") ? cfg.delivery_start_time : "18:00",
    fee: num(cfg.delivery_fee, 1000),
    freeMinQty: num(cfg.free_shipping_min_qty, 2),
    perPersonLimit: num(cfg.per_person_limit, 3),
    lowThreshold: num(cfg.low_stock_alert_threshold, 10),
  };
}

export function calculateFee(cfg: { fee: number; freeMinQty: number }, totalQty: number): number {
  if (cfg.freeMinQty > 0 && totalQty >= cfg.freeMinQty) return 0;
  return cfg.fee;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// 한국 시간 기준 날짜 문자열 "YYYY-MM-DD"
export function kstDateString(d: Date): string {
  const k = new Date(d.getTime() + KST_MS);
  return `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())}`;
}

// "YYYY-MM-DD" + "HH:MM"(한국 시간) -> 실제 시각(Date)
export function kstInstant(dateStr: string, hhmm: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h, mi) - KST_MS);
}

export type DeliverySlot = {
  date: string; // 배송 예정일 YYYY-MM-DD
  cutoffAt: Date; // 이 배송일의 주문 마감 시각
};

// 규칙: 지금이 "배송일 마감시각"보다 이른 배송일 중 가장 빠른 날이 배송 예정일
export function computeDeliverySlot(now: Date, cfg: ScheduleConfig): DeliverySlot {
  const k = new Date(now.getTime() + KST_MS);
  const baseUtc = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate());
  for (let i = 0; i < 15; i++) {
    const day = new Date(baseUtc + i * 24 * 60 * 60 * 1000);
    if (!cfg.weekdays.includes(day.getUTCDay())) continue;
    const dateStr = `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;
    const cutoffAt = kstInstant(dateStr, cfg.cutoff);
    if (now.getTime() < cutoffAt.getTime()) return { date: dateStr, cutoffAt };
  }
  // 도달하지 않는 안전장치(요일이 하나라도 있으면 15일 안에 반드시 찾음)
  const fallback = kstDateString(now);
  return { date: fallback, cutoffAt: kstInstant(fallback, cfg.cutoff) };
}

// 마감 직후에 주문했을 때 배송되는 그다음 배송일
export function computeNextSlot(slot: DeliverySlot, cfg: ScheduleConfig): DeliverySlot {
  return computeDeliverySlot(slot.cutoffAt, cfg);
}

// "10/6 (화)"
export function formatKoDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}/${d} (${WEEKDAY_LABELS[wd]})`;
}

export function formatTimeLeft(target: Date, now: Date = new Date()): string {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return "곧 마감";
  const totalMin = Math.floor(diff / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}일 ${hours}시간 남음`;
  if (hours > 0) return `${hours}시간 ${mins}분 남음`;
  return `${mins}분 남음`;
}
