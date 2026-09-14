export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import MembersClient from "./MembersClient";

export default async function MembersPage() {
  await requireAdmin();

  return (
    <div className="pb-24">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/admin/operations" aria-label="뒤로가기" className="text-lg">
          ←
        </Link>
        <h1 className="text-base font-medium">회원 조회</h1>
      </header>
      <MembersClient />
    </div>
  );
}
