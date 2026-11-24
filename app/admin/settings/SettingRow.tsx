import { ChevronRight } from "lucide-react";

// v41 환경설정: 항목마다 한 줄(이름 + 현재 값). 누르면 그 자리에서 펼쳐져 수정
export function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col">
      <h2 className="mb-0.5 text-[13px] font-bold text-neutral-500">{title}</h2>
      {children}
    </section>
  );
}

export function SettingRow({
  label,
  value,
  badge,
  defaultOpen = false,
  children,
}: {
  label: string;
  value?: string;
  badge?: { text: string; tone: "green" | "orange" };
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-neutral-100">
      <summary className="flex min-h-[50px] cursor-pointer list-none items-center gap-2.5 [&::-webkit-details-marker]:hidden">
        <span className="flex-none text-[15px]">{label}</span>
        <span className="min-w-0 flex-1 truncate text-right text-[13px] text-neutral-500">{value}</span>
        {badge && (
          <span
            className={`flex-none rounded-md px-2 py-0.5 text-xs font-bold ${
              badge.tone === "green" ? "bg-primary-bg text-primary" : "bg-orange-50 text-orange-700"
            }`}
          >
            {badge.text}
          </span>
        )}
        <ChevronRight size={16} className="flex-none text-neutral-400 transition-transform group-open:rotate-90" />
      </summary>
      <div className="pb-4 pt-1">{children}</div>
    </details>
  );
}
