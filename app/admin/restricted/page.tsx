export const dynamic = "force-dynamic";

import Link from "next/link";
import { getAdminRole } from "@/lib/adminAuth";
import AdminLogoutButton from "@/app/admin/settings/AdminLogoutButton";

const ROLE_HOME: Record<string, { href: string; label: string }> = {
  payment: { href: "/admin/orders", label: "주문관리로 이동" },
  delivery: { href: "/admin/delivery", label: "배송리스트로 이동" },
};

export default async function RestrictedPage() {
  const role = await getAdminRole();
  const home = role ? ROLE_HOME[role] : null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-base font-medium">이 화면은 권한이 없어요</p>
      <p className="text-sm text-neutral-500">허용된 화면으로만 이동할 수 있어요</p>
      {home && (
        <Link href={home.href} className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white">
          {home.label}
        </Link>
      )}
      <div className="mt-4 w-full max-w-xs">
        <AdminLogoutButton />
      </div>
    </div>
  );
}
