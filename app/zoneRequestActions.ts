"use server";

import "server-only";
import { headers } from "next/headers";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";
import { geocodeAddressDetailed } from "@/lib/geocode";

type Result =
  | { success: true; countForAddress: number }
  | { success: false; error: string };

// 로그인 없이 접근 가능한 화면이라 남용 방지용 최소한의 안전장치만 둠
// (요청 내용 자체는 피해가 없어서 엄격한 인증은 필요 없음 - 반복 남용만 막으면 됨)
const RATE_LIMIT_WINDOW_MIN = 10;
const RATE_LIMIT_MAX_PER_WINDOW = 1;
const DAILY_MAX = 200;

async function getIpHash(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return crypto.createHash("sha256").update(ip).digest("hex");
}

export async function submitZoneRequest(rawAddress: string): Promise<Result> {
  try {
    const address = rawAddress.trim();
    if (!address) throw new Error("주소를 선택해주세요");
    if (address.length > 200) throw new Error("주소가 너무 길어요");

    const ipHash = await getIpHash();

    // 같은 IP에서 짧은 시간 내 반복 제출 방지
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("zone_request")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", windowStart);
    if ((recentCount ?? 0) >= RATE_LIMIT_MAX_PER_WINDOW) {
      throw new Error("잠시 후 다시 시도해주세요");
    }

    // 하루 전체 요청 수 상한(스팸/장애 방지용 최후 안전장치)
    const dayStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dayCount } = await supabase
      .from("zone_request")
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayStart);
    if ((dayCount ?? 0) >= DAILY_MAX) {
      throw new Error("오늘 요청이 많아 잠시 후 다시 시도해주세요");
    }

    // 실패 이유(reason)까지 같이 저장해서 관리자 화면에서 "왜 안 잡혔는지" 바로 확인 가능하게 함
    const geo = await geocodeAddressDetailed(address);

    const { error } = await supabase.from("zone_request").insert({
      road_address: address,
      lat: geo.ok ? geo.lat : null,
      lng: geo.ok ? geo.lng : null,
      geo_reason: geo.ok ? null : geo.reason,
      geo_detail: geo.ok ? null : geo.detail ?? null,
      ip_hash: ipHash,
    });
    if (error) throw new Error(error.message);

    const { count: totalForAddress } = await supabase
      .from("zone_request")
      .select("id", { count: "exact", head: true })
      .eq("road_address", address);

    return { success: true, countForAddress: totalForAddress ?? 1 };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "요청 중 오류가 발생했어요" };
  }
}

// 로그인전 화면에 보여줄 누적 요청 건수(공개용, 전체 합계만)
export async function getZoneRequestTotalCount(): Promise<number> {
  const { count } = await supabase.from("zone_request").select("id", { count: "exact", head: true });
  return count ?? 0;
}
