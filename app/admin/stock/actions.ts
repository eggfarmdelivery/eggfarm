"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";
import { adjustStock } from "@/lib/stock";

type Result = { success: true } | { success: false; error: string };

// 입고: 현재 재고에 N판 더함
export async function addStock(productId: string, qty: number): Promise<Result> {
  try {
    await requireOwner();
    const n = Math.floor(Number(qty));
    if (!Number.isFinite(n) || n <= 0) throw new Error("1 이상의 숫자를 입력해주세요");
    if (n > 100000) throw new Error("숫자가 너무 커요");
    const res = await adjustStock(productId, n, "입고");
    if (!res.ok) throw new Error(res.error);
    revalidatePath("/admin/stock");
    revalidatePath("/b2c");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

// 직접 수정: 실제 재고를 세어보고 숫자를 맞출 때 사용
export async function setStock(productId: string, newQty: number): Promise<Result> {
  try {
    await requireOwner();
    const n = Math.floor(Number(newQty));
    if (!Number.isFinite(n) || n < 0) throw new Error("0 이상의 숫자를 입력해주세요");
    if (n > 100000) throw new Error("숫자가 너무 커요");
    const { data: p } = await supabase.from("product").select("stock_qty").eq("id", productId).single();
    if (!p) throw new Error("상품을 찾을 수 없어요");
    const delta = n - (p.stock_qty ?? 0);
    if (delta === 0) return { success: true };
    const res = await adjustStock(productId, delta, "직접수정");
    if (!res.ok) throw new Error(res.error);
    revalidatePath("/admin/stock");
    revalidatePath("/b2c");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}
