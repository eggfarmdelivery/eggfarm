import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "eggfarm_admin";

export async function requireAdmin() {
  const store = await cookies();
  if (store.get(COOKIE_NAME)?.value !== "ok") {
    redirect("/admin/login");
  }
}

export async function setAdminCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "ok", { httpOnly: true, path: "/", maxAge: 60 * 60 * 8 });
}
