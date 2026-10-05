import { redirect } from "next/navigation";

// 상품 관리는 "상품·재고 관리"(/admin/stock)로 합쳐졌어요
export default function ProductsPage() {
  redirect("/admin/stock");
}
