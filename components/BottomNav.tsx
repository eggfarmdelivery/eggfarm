import Link from "next/link";

const items = [
  { href: "/b2c", label: "홈" },
  { href: "/b2c/orders", label: "주문내역" },
  { href: "/b2c/mypage", label: "마이페이지" },
];

export default function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-neutral-200 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
      <ul className="flex justify-around">
        {items.map((item) => (
          <li key={item.href} className="flex-1">
            <Link
              href={item.href}
              className={`flex flex-col items-center gap-1 py-3.5 text-sm ${
                active === item.href
                  ? "text-primary font-semibold"
                  : "text-neutral-400"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
