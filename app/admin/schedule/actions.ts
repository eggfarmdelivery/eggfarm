"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";

type Result = { success: true } | { success: false; error: string };

function validTime(v: string) {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(v);
}

export async function saveSchedule(formData: FormData): Promise<Result> {
  try {
    await requireOwner();
    const weekdays = formData
      .getAll("weekday")
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    if (weekdays.length === 0) throw new Error("배송 요일을 하나 이상 선택해주세요");
    const cutoff = String(formData.get("cutoff") ?? "").trim();
    const start = String(formData.get("start") ?? "").trim();
    if (!validTime(cutoff) || !validTime(start)) throw new Error("시간은 17:00 같은 형식으로 입력해주세요");
    const num = (name: string, label: string) => {
      const raw = String(formData.get(name) ?? "").trim();
      const n = Number(raw);
      if (raw === "" || !Number.isInteger(n) || n < 0) throw new Error(`${label}은(는) 0 이상의 숫자로 입력해주세요`);
      return n;
    };
    const fee = num("fee", "배송비");
    const freeMin = num("free_min", "무료배송 기준");
    const limit = num("limit", "인당 한도");
    const threshold = num("threshold", "재고 알림 기준");

    const entries: [string, string][] = [
      ["delivery_weekdays", Array.from(new Set(weekdays)).sort().join(",")],
      ["order_cutoff_time", cutoff],
      ["delivery_start_time", start],
      ["delivery_fee", String(fee)],
      ["free_shipping_min_qty", String(freeMin)],
      ["per_person_limit", String(limit)],
      ["low_stock_alert_threshold", String(threshold)],
    ];
    for (const [key, value] of entries) {
      const { error } = await supabase.from("system_config").upsert({ key, value });
      if (error) throw new Error(error.message);
    }
    revalidatePath("/b2c");
    revalidatePath("/admin/schedule");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "저장 중 오류가 발생했어요" };
  }
}
