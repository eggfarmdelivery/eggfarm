"use client";

import Link from "next/link";
import { Home, ClipboardList, User, Info } from "lucide-react";
import { useViewportBottomInset } from "@/lib/useViewportBottomInset";

const items = [
  { href: "/b2c", label: "홈", Icon: Home },
  { href: "/b2c/orders", label: "주문내역", Icon: ClipboardList },
  { href: "/b2c/mypage", label: "내 정보", Icon: User },
  { href: "/b2c/guide", label: "이용안내", Icon: Info },
];

export default function BottomNav({ active }: { active: string }) {
  const extraInset = useViewportBottomInset();
  return (
    <nav
      className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-neutral-200 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: `max(env(safe-area-inset-bottom), 14px)`, bottom: extraInset }}
    >
      <ul className="flex justify-around py-1.5">
        {items.map((item) => {
          const Icon = item.Icon;
          const isActive = active === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`mx-1 flex flex-col items-center gap-0.5 rounded-xl py-2.5 text-[11px] transition-colors active:bg-primary-bg ${
                  isActive ? "bg-primary-bg font-semibold text-primary" : "text-neutral-400"
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
