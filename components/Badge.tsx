type BadgeTone = "green" | "gray" | "red";

const TONE_CLASSES: Record<BadgeTone, string> = {
  green: "bg-green-50 text-green-700",
  gray: "bg-neutral-100 text-neutral-500",
  red: "bg-red-50 text-red-500",
};

export default function Badge({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
