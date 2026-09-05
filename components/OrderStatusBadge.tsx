const styleMap: Record<string, string> = {
  입금대기: "bg-yellow-50 text-yellow-700",
  입금확인완료: "bg-blue-50 text-blue-700",
  배송위임: "bg-blue-50 text-blue-700",
  배송중: "bg-amber-50 text-amber-700",
  배송완료: "bg-green-50 text-green-700",
  초과승인대기: "bg-orange-50 text-orange-700",
  승인거절: "bg-red-50 text-red-700",
  취소: "bg-neutral-100 text-neutral-500",
};

export default function OrderStatusBadge({ status }: { status: string }) {
  const cls = styleMap[status] ?? "bg-neutral-100 text-neutral-500";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
