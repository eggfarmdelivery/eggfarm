export const dynamic = "force-dynamic";

import { MessageCircle } from "lucide-react";
import { getConfig } from "@/lib/settings";
import BottomNav from "@/components/BottomNav";
import FaqAccordion from "./FaqAccordion";

export default async function GuidePage() {
  const kakaoUrl = await getConfig("kakao_openchat_url");

  return (
    <div className="pb-32">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">이용안내</h1>
      </header>

      <main className="px-5">
        <section className="mb-6 rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-600">
          에그팜은 동네 계란 배송 서비스예요. 정해진 판매기간에 주문하면 우리 단지로
          신선한 계란을 배송해드려요.
        </section>

        <p className="mb-2 text-sm font-medium">자주 묻는 질문</p>
        <FaqAccordion />

        {kakaoUrl && (
          <a
            href={kakaoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] py-3 text-sm font-medium text-[#191600]"
          >
            <MessageCircle size={18} />
            문의하기
          </a>
        )}
      </main>

      <BottomNav active="/b2c/guide" />
    </div>
  );
}
