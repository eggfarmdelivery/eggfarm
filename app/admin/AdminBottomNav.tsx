"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, Wallet, Settings } from "lucide-react";

const TABS = [
  { key: "status", href: "/admin", label: "현황", Icon: LayoutDashboard, match: ["/admin"] },
  {
    key: "operations",
    href: "/admin/operations",
    label: "운영",
    Icon: ClipboardList,
    match: [
      "/admin/operations",
      "/admin/orders",
      "/admin/campaign",
      "/admin/delivery",
      "/admin/zones",
      "/admin/products",
    ],
  },
  {
    key: "records",
    href: "/admin/records",
    label: "정산·기록",
    Icon: Wallet,
    match: ["/admin/records", "/admin/settlement", "/admin/quotes", "/admin/logs"],
  },
  {
    key: "settings",
    href: "/admin/settings",
    label: "환경설정",
    Icon: Settings,
    match: ["/admin/settings"],
  },
];

export default function AdminBottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin/login")) return null;

  return (
    <nav
      className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-neutral-200 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}
    >
      <ul className="flex justify-around py-1.5">
        {TABS.map((tab) => {
          const Icon = tab.Icon;
          // "/admin"은 정확히 일치할 때만, 나머지는 하위 경로 전부 포함해서 활성 처리
          const isActive =
            tab.key === "status"
              ? pathname === "/admin"
              : tab.match.some((p) => pathname === p || pathname.startsWith(p + "/"));
          return (
            <li key={tab.key} className="flex-1">
              <Link
                href={tab.href}
                className={`mx-1 flex flex-col items-center gap-0.5 rounded-xl py-2.5 text-[11px] transition-colors active:bg-primary-bg ${
                  isActive ? "bg-primary-bg font-semibold text-primary" : "text-neutral-400"
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
