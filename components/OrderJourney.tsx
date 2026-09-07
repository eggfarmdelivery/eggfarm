type Step = {
  key: string;
  label: string;
  icon: "cash" | "truck" | "check" | "box";
};

const STEPS: Step[] = [
  { key: "입금대기", label: "입금대기", icon: "cash" },
  { key: "입금확인완료", label: "입금확인", icon: "cash" },
  { key: "배송준비", label: "배송준비", icon: "box" },
  { key: "배송중", label: "배송중", icon: "truck" },
  { key: "배송완료", label: "배송완료", icon: "check" },
];

// 정기배송은 입금 단계 없이 바로 배송위임으로 시작하므로 "배송준비" 취급
const STATUS_TO_STEP_INDEX: Record<string, number> = {
  입금대기: 0,
  입금확인완료: 1,
  배송준비: 2,
  배송위임: 2,
  배송중: 3,
  배송완료: 4,
};

function StepIcon({ icon, tone }: { icon: Step["icon"]; tone: "done" | "current" | "todo" }) {
  const color =
    tone === "done" ? "#fff" : tone === "current" ? "#E8940C" : "#B5B5B5";
  const common = { width: 14, height: 14, fill: "none", stroke: color, strokeWidth: 2 };

  if (icon === "cash") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }
  if (icon === "truck") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <rect x="1" y="7" width="13" height="9" rx="1" />
        <path d="M14 10h4l3 3v3h-7z" />
        <circle cx="6" cy="18" r="1.5" />
        <circle cx="17" cy="18" r="1.5" />
      </svg>
    );
  }
  if (icon === "check") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M4 12l5 5 11-11" />
      </svg>
    );
  }
  return (
    <svg {...common} viewBox="0 0 24 24">
      <rect x="3" y="7" width="18" height="13" rx="1" />
      <path d="M3 7l9-4 9 4" />
    </svg>
  );
}

export default function OrderJourney({ status }: { status: string }) {
  // 취소/승인거절/환불 등 별도 상태는 여정 표시 대신 문구로만
  if (!(status in STATUS_TO_STEP_INDEX)) {
    return null;
  }

  const currentIndex = STATUS_TO_STEP_INDEX[status];

  return (
    <div className="flex items-start py-1">
      {STEPS.map((step, i) => {
        const tone = i < currentIndex ? "done" : i === currentIndex ? "current" : "todo";
        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-1 flex-col items-center text-center">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  tone === "done"
                    ? "bg-primary"
                    : tone === "current"
                      ? "border-2 border-primary bg-primary-bg"
                      : "border-2 border-neutral-200 bg-white"
                }`}
              >
                <StepIcon icon={step.icon} tone={tone} />
              </div>
              <p
                className={`mt-1 text-[10px] ${
                  tone === "todo" ? "text-neutral-400" : "text-neutral-700"
                } ${tone === "current" ? "font-medium text-primary" : ""}`}
              >
                {step.label}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 ${i < currentIndex ? "bg-primary" : "bg-neutral-200"}`}
                style={{ marginTop: -14 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
