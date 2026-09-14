import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "eggfarm_admin";

// 쿠키값: "owner" 또는 "staff:payment:<...>" / "staff:delivery:<...>" / "staff:b2b_delivery:<...>"
export type AdminRole = "owner" | "payment" | "delivery" | "b2b_delivery";

const ROLE_LABELS: Record<Exclude<AdminRole, "owner">, string> = {
  payment: "입금확인 담당",
  delivery: "배송 담당",
  b2b_delivery: "B2B 배송 담당",
};

type ParsedAdmin = { role: AdminRole; label: string };

function parseCookieValue(value: string | undefined): ParsedAdmin | null {
  if (!value) return null;
  if (value === "owner") return { role: "owner", label: "사장님" };
  if (value.startsWith("staff:")) {
    const rest = value.slice("staff:".length);
    const sep = rest.indexOf(":");
    const perm = sep === -1 ? rest : rest.slice(0, sep);
    const rawLabel = sep === -1 ? "" : rest.slice(sep + 1);
    if (perm === "payment" || perm === "delivery" || perm === "b2b_delivery") {
      const decoded = rawLabel ? decodeURIComponent(rawLabel) : null;
      return { role: perm, label: decoded || ROLE_LABELS[perm] };
    }
  }
  return null;
}

// 로그인 여부만 확인 - 어떤 권한이든(사장님/입금확인담당/배송담당) 통과함.
// 개별 화면에서 더 좁은 권한이 필요하면 requireOwner()나 requirePermission()을 추가로 씀
export async function requireAdmin(): Promise<AdminRole> {
  const store = await cookies();
  const parsed = parseCookieValue(store.get(COOKIE_NAME)?.value);
  if (!parsed) redirect("/admin/login");
  return parsed.role;
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
  return parseCookieValue(store.get(COOKIE_NAME)?.value)?.role ?? null;
}

// 상태변경 이력에 "누가 처리했는지" 남기기 위한 표시용 이름표 ("사장님" / 담당자 이름표)
export async function getAdminActorLabel(): Promise<string> {
  const store = await cookies();
  return parseCookieValue(store.get(COOKIE_NAME)?.value)?.label ?? "관리자";
}

export async function setAdminCookie(role: AdminRole = "owner", label?: string) {
  const store = await cookies();
  const value =
    role === "owner" ? "owner" : `staff:${role}${label ? `:${encodeURIComponent(label)}` : ""}`;
  store.set(COOKIE_NAME, value, { httpOnly: true, path: "/", maxAge: 60 * 60 * 8 });
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
