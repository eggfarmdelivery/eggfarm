import "server-only";
import { createClient } from "@supabase/supabase-js";

// 이 클라이언트는 서버 전용 파일(서버 액션/서버 컴포넌트/route handler)에서만 import됨 -
// 브라우저에는 절대 번들되지 않음(확인 완료). 서비스롤 키로 RLS를 우회해서 쓰기 때문에,
// 모든 테이블에 RLS를 걸어 일반 anon key로는 직접 접근이 안 되게 막을 수 있음
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
