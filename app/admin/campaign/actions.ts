"use server";

import { supabase } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";

type Result = { success: true } | { success: false; error: string };

async function uploadCampaignPhoto(file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `campaign-${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from("product-photos")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(`사진 업로드 실패: ${error.message}`);
  const { data } = admin.storage.from("product-photos").getPublicUrl(path);
  return data.publicUrl;
}

function parseCampaignForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const opensAtIso = String(formData.get("opens_at") ?? "").trim();
  const closesAtIso = String(formData.get("closes_at") ?? "").trim();
  const productIds = formData.getAll("product_ids").map(String);

  if (!title) throw new Error("캠페인 제목을 입력해주세요");
  if (!opensAtIso || !closesAtIso) throw new Error("오픈/마감 일시를 입력해주세요");
  const opensAt = new Date(opensAtIso);
  const closesAt = new Date(closesAtIso);
  if (isNaN(opensAt.getTime()) || isNaN(closesAt.getTime())) {
    throw new Error("일시가 올바르지 않아요");
  }
  if (closesAt.getTime() <= opensAt.getTime()) {
    throw new Error("마감 일시는 오픈 일시보다 이후여야 해요");
  }
  if (productIds.length === 0) throw new Error("포함할 품목을 하나 이상 선택해주세요");

  return { title, opensAt, closesAt, productIds };
}

// 새 캠페인 오픈 - 여러 캠페인을 동시에 열어둘 수 있음(항상 새 row로 추가됨)
export async function openCampaign(formData: FormData): Promise<Result> {
  try {
    await requireAdmin();
    const { title, opensAt, closesAt, productIds } = parseCampaignForm(formData);
    const photo = formData.get("photo") as File | null;
    const photoUrl = photo && photo.size > 0 ? await uploadCampaignPhoto(photo) : null;

    const { data: campaign, error } = await supabase
      .from("campaign")
      .insert({
        title,
        photo_url: photoUrl,
        opens_at: opensAt.toISOString(),
        closes_at: closesAt.toISOString(),
      })
      .select("id")
      .single();
    if (error || !campaign) throw new Error(error?.message ?? "캠페인 생성 실패");

    const { error: linkError } = await supabase.from("campaign_product").insert(
      productIds.map((productId) => ({ campaign_id: campaign.id, product_id: productId }))
    );
    if (linkError) throw new Error(linkError.message);

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "오픈 중 오류가 발생했어요" };
  }
}

// 기존 캠페인 수정 (제목/사진/일정/포함품목)
export async function updateCampaign(campaignId: string, formData: FormData): Promise<Result> {
  try {
    await requireAdmin();
    const { title, opensAt, closesAt, productIds } = parseCampaignForm(formData);
    const photo = formData.get("photo") as File | null;

    const update: Record<string, unknown> = {
      title,
      opens_at: opensAt.toISOString(),
      closes_at: closesAt.toISOString(),
    };
    if (photo && photo.size > 0) {
      update.photo_url = await uploadCampaignPhoto(photo);
    }

    const { error } = await supabase.from("campaign").update(update).eq("id", campaignId);
    if (error) throw new Error(error.message);

    const { error: delError } = await supabase
      .from("campaign_product")
      .delete()
      .eq("campaign_id", campaignId);
    if (delError) throw new Error(delError.message);

    const { error: insError } = await supabase.from("campaign_product").insert(
      productIds.map((productId) => ({ campaign_id: campaignId, product_id: productId }))
    );
    if (insError) throw new Error(insError.message);

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "수정 중 오류가 발생했어요" };
  }
}

// 조기마감 (관리자 수동)
export async function closeCampaignEarly(campaignId: string): Promise<Result> {
  try {
    await requireAdmin();
    const { error } = await supabase
      .from("campaign")
      .update({ closed_early_at: new Date().toISOString() })
      .eq("id", campaignId)
      .is("closed_early_at", null);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요" };
  }
}

// 캠페인 삭제 (테스트 데이터 정리 등) - campaign_product는 on delete cascade로 함께 삭제됨
export async function deleteCampaign(campaignId: string): Promise<Result> {
  try {
    await requireAdmin();
    const { error } = await supabase.from("campaign").delete().eq("id", campaignId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "삭제 중 오류가 발생했어요" };
  }
}
