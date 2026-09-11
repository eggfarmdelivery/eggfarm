import { redirect } from "next/navigation";

// 대시보드가 "현황" 탭 기본화면(/admin)으로 통합돼서 옛 링크/북마크 호환용으로만 남겨둠
export default function DashboardRedirectPage() {
  redirect("/admin");
}
