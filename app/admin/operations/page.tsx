export const dynamic = "force-dynamic";

import Link from "next/link";
import { ClipboardList, Megaphone, Truck, Building2, Package, ChevronRight, Store } from "lucide-react";
import { requireAdmin } from "@/lib/adminAuth";

const items = [
  { href: "/admin/orders", label: "주문관리", icon: ClipboardList },
  { href: "/admin/campaign", label: "캠페인 관리", icon: Megaphone },
  { href: "/admin/delivery", label: "배송 리스트", icon: Truck },
  { href: "/admin/zones", label: "배송가능 단지", icon: Building2 },
  { href: "/admin/products", label: "상품관리", icon: Package },
  { href: "/admin/b2b-accounts", label: "거래처 관리", icon: Store },
  { href: "/admin/b2b-delivery", label: "B2B 배송리스트", icon: Truck },
];

export default async function OperationsPage() {
  await requireAdmin();

  return (
    <div className="pb-24">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">운영</h1>
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
