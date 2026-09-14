import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "eggfarm_admin";

// 쿠키값: "owner" 또는 "staff:payment" / "staff:delivery"
export type AdminRole = "owner" | "payment" | "delivery";

function parseCookieValue(value: string | undefined): AdminRole | null {
  if (!value) return null;
  if (value === "owner") return "owner";
  if (value.startsWith("staff:")) {
    const perm = value.slice("staff:".length);
    if (perm === "payment" || perm === "delivery") return perm;
  }
  return null;
}

// 로그인 여부만 확인 - 어떤 권한이든(사장님/입금확인담당/배송담당) 통과함.
// 개별 화면에서 더 좁은 권한이 필요하면 requireOwner()나 requirePermission()을 추가로 씀
export async function requireAdmin(): Promise<AdminRole> {
  const store = await cookies();
  const role = parseCookieValue(store.get(COOKIE_NAME)?.value);
  if (!role) redirect("/admin/login");
  return role;
}

// 사장님(전체 권한) 전용 화면에서 사용 - 제한된 직원 계정은 여기서 막힘
export async function requireOwner(): Promise<void> {
  const role = await requireAdmin();
  if (role !== "owner") redirect("/admin/restricted");
}

// 특정 권한(입금확인/배송) 담당 직원 전용 화면 - 사장님은 항상 통과됨
export async function requirePermission(allowed: AdminRole[]): Promise<AdminRole> {
  const role = await requireAdmin();
  if (role === "owner") return role;
  if (!allowed.includes(role)) redirect("/admin/restricted");
  return role;
}

export async function getAdminRole(): Promise<AdminRole | null> {
  const store = await cookies();
  return parseCookieValue(store.get(COOKIE_NAME)?.value);
}

export async function setAdminCookie(role: AdminRole = "owner") {
  const store = await cookies();
  const value = role === "owner" ? "owner" : `staff:${role}`;
  store.set(COOKIE_NAME, value, { httpOnly: true, path: "/", maxAge: 60 * 60 * 8 });
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
