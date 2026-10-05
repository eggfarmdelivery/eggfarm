import "server-only";
import { getConfigs } from "@/lib/settings";
import { SCHEDULE_KEYS, parseSchedule, type ScheduleConfig } from "@/lib/scheduleShared";

export async function getSchedule(): Promise<ScheduleConfig> {
  const cfg = await getConfigs(SCHEDULE_KEYS);
  return parseSchedule(cfg);
}
