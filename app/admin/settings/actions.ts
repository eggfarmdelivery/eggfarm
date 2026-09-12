"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, clearAdminCookie } from "@/lib/adminAuth";
import { sendKakaoMemoRaw } from "@/lib/kakao";

export async function adminLogout() {
  await clearAdminCookie();
  redirect("/admin/login");
}

type Result = { success: true } | { success: false; error: string };

// ---------------------------------------------------------
// 테스트 계정 초기화 도구 - 닉네임/전화번호로 검색 후 관련 데이터 전부 삭제
// account 테이블은 RLS가 걸려있어 관리자는 서비스롤 클라이언트로 조회해야 함
// ---------------------------------------------------------
export type AccountSearchResult = {
  id: string;
  name: string | null;
  nickname: string | null;
  phone: string | null;
  is_test: boolean;
};

export async function searchAccounts(query: string): Promise<AccountSearchResult[] | { error: string }> {
  try {
    await requireAdmin();
    const q = query.trim();
    if (!q) return [];
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("account")
      .select("id, name, nickname, phone, is_test")
      .or(`nickname.ilike.%${q}%,phone.ilike.%${q}%,name.ilike.%${q}%`)
      .limit(10);
    if (error) throw new Error(error.message);
    return data ?? [];
  } catch (e) {
    return { error: e instanceof Error ? e.message : "검색 중 오류가 발생했어요" };
  }
}

// 반복 테스트용 계정 지정/해제 - 지정된 계정의 주문은 캠페인 재고·대시보드 통계에서 제외됨
export async function setTestAccount(accountId: string, isTest: boolean): Promise<Result> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from("account").update({ is_test: isTest }).eq("id", accountId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

export async function resetTestAccount(accountId: string): Promise<Result> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    await admin.from("credit_ledger").delete().eq("account_id", accountId);
    await admin.from("b2b_account_price").delete().eq("account_id", accountId);
    await admin.from("b2b_price_history").delete().eq("account_id", accountId);
    await admin.from("b2b_settlement").delete().eq("account_id", accountId);
    await admin.from("b2c_order").delete().eq("account_id", accountId);
    await admin.from("b2b_order").delete().eq("account_id", accountId);
    const { error } = await admin.from("account").delete().eq("id", accountId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "초기화 중 오류가 발생했어요" };
  }
}

export async function updateSettings(formData: FormData): Promise<Result> {
  try {
    await requireAdmin();
    const entries: [string, string][] = [
      ["bank_name", String(formData.get("bank_name") ?? "").trim()],
      ["bank_account", String(formData.get("bank_account") ?? "").trim()],
      ["bank_holder", String(formData.get("bank_holder") ?? "").trim()],
      ["kakao_openchat_url", String(formData.get("kakao_openchat_url") ?? "").trim()],
      ["notice_enabled", formData.get("notice_enabled") === "on" ? "true" : "false"],
      ["notice_text", String(formData.get("notice_text") ?? "").trim()],
      ["b2b_min_order_amount", String(formData.get("b2b_min_order_amount") ?? "").trim()],
      ["b2b_origin_address", String(formData.get("b2b_origin_address") ?? "").trim()],
    ];

    for (const [key, value] of entries) {
      const { error } = await supabase.from("system_config").upsert({ key, value });
      if (error) throw new Error(error.message);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "저장 중 오류가 발생했어요" };
  }
}

export async function testKakaoNotify(): Promise<Result> {
  await requireAdmin();
  return sendKakaoMemoRaw("[테스트] 에그팜 알림이 정상적으로 도착했어요");
}
