export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  Megaphone,
  Building2,
  Package,
  Truck,
  Wallet,
  FileText,
  History,
  Settings,
  ChevronRight,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";
import ConsoleClient from "./ConsoleClient";

export default async function AdminConsole() {
  await requireAdmin();
  // 관리자는 일반 로그인 사용자가 아니라 RLS(auth.uid())를 못 타므로,
  // 회원 이름/전화번호처럼 RLS가 걸린 정보를 보려면 서비스롤 클라이언트가 필요함
  const admin = createAdminClient();

  const { data: b2cOrders } = await admin
    .from("b2c_order")
    .select(
      "id, order_type, status, is_overflow, total_amount, created_at, campaign_id, campaign(title), account(name, phone, nickname, address), b2c_order_item(quantity, product(name)), refund_bank_name, refund_account_number, refund_holder_name"
    )
    .order("created_at", { ascending: false });

  const { data: b2bOrders } = await admin
    .from("b2b_order")
    .select("id, status, total_amount, created_at, account(business_name)")
    .order("created_at", { ascending: false });

  const menuGroups = [
    {
      label: "운영",
      items: [
        { href: "/admin/campaign", label: "캠페인 관리", icon: Megaphone },
        { href: "/admin/delivery", label: "배송 리스트", icon: Truck },
        { href: "/admin/zones", label: "배송가능 단지", icon: Building2 },
        { href: "/admin/products", label: "상품관리", icon: Package },
      ],
    },
    {
      label: "정산 · 기록",
      items: [
        { href: "/admin/settlement", label: "정산", icon: Wallet },
        { href: "/admin/quotes", label: "견적", icon: FileText },
        { href: "/admin/logs", label: "상태변경 이력", icon: History },
      ],
    },
    {
      label: "환경설정",
      items: [{ href: "/admin/settings", label: "설정", icon: Settings }],
    },
  ];

  return (
    <div className="pb-10">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">관리자 콘솔</h1>
      </header>

      <div className="mb-5 space-y-4 px-5">
        {menuGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 text-xs text-neutral-400">{group.label}</p>
            <div className="overflow-hidden rounded-xl border border-neutral-200">
              {group.items.map((item, idx) => {
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
        ))}
      </div>

      <ConsoleClient
        b2cOrders={(b2cOrders as any) ?? []}
        b2bOrders={(b2bOrders as any) ?? []}
      />
    </div>
  );
}
