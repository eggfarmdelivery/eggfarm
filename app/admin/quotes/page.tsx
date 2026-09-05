export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import QuotesClient from "./QuotesClient";

export default async function QuotesPage() {
  await requireAdmin();

  const { data: quotes } = await supabase
    .from("quote_request")
    .select("id, business_name, contact_phone, content, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="pb-10">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">견적 문의함</h1>
      </header>
      <QuotesClient quotes={(quotes as any) ?? []} />
    </div>
  );
}
