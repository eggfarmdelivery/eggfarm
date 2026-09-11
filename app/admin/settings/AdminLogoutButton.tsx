"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { adminLogout } from "./actions";

export default function AdminLogoutButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        adminLogout();
      }}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 py-3 text-sm text-neutral-500 disabled:opacity-60"
    >
      <LogOut size={16} />
      {pending ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
