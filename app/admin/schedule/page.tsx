export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireOwner } from "@/lib/adminAuth";
import { getSchedule } from "@/lib/schedule";
import ScheduleClient from "./ScheduleClient";

export default async function SchedulePage() {
  await requireOwner();
  const schedule = await getSchedule();
  return (
    <div className="pb-28">
      <header className="flex items-center gap-2 bg-white px-5 py-4">
        <Link href="/admin/operations" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-bold">배송 설정</h1>
      </header>
      <ScheduleClient schedule={schedule} />
    </div>
  );
}
