"use client";

import { useState } from "react";

export default function MyPageTabs({
  ordersContent,
  profileContent,
}: {
  ordersContent: React.ReactNode;
  profileContent: React.ReactNode;
}) {
  const [tab, setTab] = useState<"orders" | "profile">("orders");

  return (
    <div>
      <div className="mb-4 flex border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setTab("orders")}
          className={`flex-1 pb-2.5 text-sm ${
            tab === "orders"
              ? "border-b-2 border-primary font-medium text-neutral-900"
              : "text-neutral-400"
          }`}
        >
          주문내역
        </button>
        <button
          type="button"
          onClick={() => setTab("profile")}
          className={`flex-1 pb-2.5 text-sm ${
            tab === "profile"
              ? "border-b-2 border-primary font-medium text-neutral-900"
              : "text-neutral-400"
          }`}
        >
          내 정보 수정
        </button>
      </div>

      <div className={tab === "orders" ? "" : "hidden"}>{ordersContent}</div>
      <div className={tab === "profile" ? "" : "hidden"}>{profileContent}</div>
    </div>
  );
}
