import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function uploadDeliveryPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드 가능합니다");
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("파일 크기는 5MB 이하여야 합니다");
  }

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const fileName = `delivery-${timestamp}-${random}.jpg`;

  const { data, error } = await supabase.storage
    .from("delivery-photos")
    .upload(fileName, file);

  if (error) {
    throw new Error(error.message);
  }

  const { data: publicData } = supabase.storage
    .from("delivery-photos")
    .getPublicUrl(fileName);

  return publicData.publicUrl;
}
