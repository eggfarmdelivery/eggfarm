import Link from "next/link";

const items = [
  { href: "/b2c", label: "홈" },
  { href: "/b2c/orders", label: "주문내역" },
  { href: "/b2c/mypage", label: "마이페이지" },
];

export default function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-neutral-200 bg-white">
      <ul className="flex justify-around py-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs ${
                active === item.href
                  ? "text-primary font-medium"
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
