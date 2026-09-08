import Link from "next/link";

const items = [
  { href: "/b2c", label: "홈" },
  { href: "/b2c/mypage", label: "내 정보" },
];

export default function BottomNav({ active }: { active: string }) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-neutral-200 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}
    >
      <ul className="flex justify-around py-1.5">
        {items.map((item) => (
          <li key={item.href} className="flex-1">
            <Link
              href={item.href}
              className={`mx-1.5 flex flex-col items-center gap-1 rounded-xl py-3 text-base transition-colors active:bg-primary-bg ${
                active === item.href
                  ? "bg-primary-bg font-semibold text-primary"
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
