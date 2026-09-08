import { redirect } from "next/navigation";

// 주문내역이 마이페이지("내 정보")로 통합돼서 옛 링크/북마크 호환용으로만 남겨둠
export default function B2COrdersPage() {
  redirect("/b2c/mypage");
}
