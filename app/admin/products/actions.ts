"use server";

import { supabase } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";
import { revalidatePath } from "next/cache";

type Result = { success: true } | { success: false; error: string };

async function uploadProductPhoto(file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from("product-photos")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(`사진 업로드 실패: ${error.message}`);
  const { data } = admin.storage.from("product-photos").getPublicUrl(path);
  return data.publicUrl;
}

// 신규 상품 등록 (사진은 선택, 이름+가격은 필수). 재고는 입고로 채움
export async function createProduct(formData: FormData): Promise<Result> {
  try {
    await requireAdmin();
    const name = String(formData.get("name") ?? "").trim();
    const basePrice = Number(formData.get("base_price"));
    const photo = formData.get("photo") as File | null;

    if (!name || !basePrice) throw new Error("상품명과 가격을 입력해주세요");

    const photoUrl = photo && photo.size > 0 ? await uploadProductPhoto(photo) : null;

    const { data: product, error } = await supabase
      .from("product")
      .insert({ name, base_price: basePrice, photo_url: photoUrl })
      .select("id")
      .single();
    if (error || !product) throw new Error(error?.message ?? "상품 등록 실패");

    revalidatePath("/b2c");
    revalidatePath("/b2c/order");
    revalidatePath("/admin/stock");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "등록 중 오류가 발생했어요" };
  }
}

// 기존 상품 수정 (이름/가격/사진/판매여부)
export async function updateProduct(formData: FormData): Promise<Result> {
  try {
    await requireAdmin();
    const productId = String(formData.get("product_id"));
    const name = String(formData.get("name") ?? "").trim();
    const basePrice = Number(formData.get("base_price"));
    const isActive = formData.get("is_active") === "on";
    const photo = formData.get("photo") as File | null;

    if (!name || !basePrice) throw new Error("상품명과 가격을 입력해주세요");

    const updatePayload: Record<string, unknown> = {
      name,
      base_price: basePrice,
      is_active: isActive,
    };
    if (photo && photo.size > 0) {
      updatePayload.photo_url = await uploadProductPhoto(photo);
    }

    const { error } = await supabase.from("product").update(updatePayload).eq("id", productId);
    if (error) throw new Error(error.message);

    revalidatePath("/b2c");
    revalidatePath("/b2c/order");
    revalidatePath("/admin/stock");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "저장 중 오류가 발생했어요" };
  }
}
