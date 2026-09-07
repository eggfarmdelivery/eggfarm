"use server";

import { setAdminCookie } from "@/lib/adminAuth";

export async function adminLogin(formData: FormData) {
  const password = formData.get("password") as string;
  if (!process.env.ADMIN_PASSWORD) {
    return { success: false as const, error: "관리자 비밀번호가 서버에 설정되어있지 않아요" };
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    return { success: false as const, error: "비밀번호가 올바르지 않아요" };
  }
  await setAdminCookie();
  return { success: true as const };
}
