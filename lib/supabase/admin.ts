import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// 절대 클라이언트(브라우저)로 노출되면 안 됨 — 서버 액션/라우트 핸들러에서만 import
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
