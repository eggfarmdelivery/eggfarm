import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 배송완료 사진 90일 후 자동삭제 - 용량관리 목적
// 주문기록/개인정보(닉네임, 전화번호, 주소 등)는 전자상거래법상 5년 보관의무가 있어서 그대로 유지하고,
// delivery_photo_url(스토리지 파일 + 컬럼값)만 지움. b2b_order는 정산 증빙 성격이 강해 이번엔 건드리지 않음
const RETENTION_DAYS = 90;

function extractStoragePath(publicUrl: string): string | null {
  const marker = "/delivery-photos/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: targets, error } = await admin
    .from("b2c_order")
    .select("id, delivery_photo_url")
    .eq("status", "배송완료")
    .not("delivery_photo_url", "is", null)
    .lt("delivery_completed_at", cutoff);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let deleted = 0;
  const failures: string[] = [];

  for (const order of targets ?? []) {
    try {
      const path = order.delivery_photo_url ? extractStoragePath(order.delivery_photo_url) : null;
      if (path) {
        await admin.storage.from("delivery-photos").remove([path]);
      }
      const { error: updateError } = await admin
        .from("b2c_order")
        .update({ delivery_photo_url: null })
        .eq("id", order.id);
      if (updateError) throw new Error(updateError.message);
      deleted += 1;
    } catch (e) {
      failures.push(order.id);
    }
  }

  return NextResponse.json({ checked: targets?.length ?? 0, deleted, failures });
}
