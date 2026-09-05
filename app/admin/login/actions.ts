"use server";

import { setAdminCookie } from "@/lib/adminAuth";

export async function adminLogin(formData: FormData) {
  const password = formData.get("password") as string;
  if (password !== process.env.ADMIN_PASSWORD) {
    throw new Error("비밀번호가 올바르지 않아요");
  }
  await setAdminCookie();
  return { success: true as const };
}
