export const dynamic = "force-dynamic";

import Link from "next/link";
import { Wallet, FileText, History, ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/adminAuth";

const items = [
  { href: "/admin/settlement", label: "정산", icon: Wallet },
  { href: "/admin/quotes", label: "견적", icon: FileText },
  { href: "/admin/logs", label: "상태변경 이력", icon: History },
];

export default async function RecordsPage() {
  await requireAdmin();

  return (
    <div className="pb-24">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">정산 · 기록</h1>
      </header>

      <div className="px-5">
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3.5 py-3 text-sm ${
                  idx > 0 ? "border-t border-neutral-200" : ""
                }`}
              >
                <Icon size={18} className="text-neutral-500" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight size={16} className="text-neutral-300" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
