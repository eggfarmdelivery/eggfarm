import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getAccountId(role: "b2c" | "b2b"): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?role=${role}`);

  const { data: account } = await supabase
    .from("account")
    .select("id")
    .eq("auth_user_id", user.id)
    .eq("role", role)
    .maybeSingle();

  if (!account) {
    redirect(role === "b2c" ? "/onboarding" : `/login?role=b2b&error=not_registered`);
  }

  return account.id as string;
}
