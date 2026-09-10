import type { Metadata } from "next";

// 홈화면에 추가했을 때 고객용 첫화면(/)이 아니라 관리자 콘솔(/admin)로 열리도록
// 관리자 영역 전용 매니페스트를 별도로 지정
export const metadata: Metadata = {
  manifest: "/admin-manifest.json",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
