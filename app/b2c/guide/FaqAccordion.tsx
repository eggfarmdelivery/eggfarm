"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS: [string, string][] = [
  ["회원가입은 어떻게 하나요?", "카카오 계정으로 로그인 후, 거주하는 아파트를 선택하면 가입이 완료됩니다."],
  [
    "아무 주소로나 배송 가능한가요?",
    "아니요, 에그팜에서 지정한 배송 가능한 단지만 주문·배송이 가능합니다. (현재 기준이며 추후 변동될 수 있습니다)",
  ],
  [
    "상시 주문이 가능한가요?",
    "아니요, 정해진 판매기간 동안만 주문할 수 있고, 마감시간이 지나거나 재고가 소진되면 조기 마감됩니다. (현재 기준이며 추후 변동될 수 있습니다)",
  ],
  ["결제는 어떻게 하나요?", "무통장입금만 가능합니다. 주문 후 안내되는 계좌로 입금해주시면 확인 후 배송이 진행됩니다."],
  ["배송비는 얼마인가요?", "1판 주문 시 1,000원이며, 2판 이상 주문하시면 무료배송입니다."],
  [
    "주문을 취소하고 싶어요.",
    "입금 전이라면 주문내역에서 바로 취소 가능합니다. 입금 후 취소는 환불계좌 정보를 입력해주시면 관리자 확인 후 환불 처리됩니다.",
  ],
  [
    "배송은 얼마나 걸리나요?",
    "판매기간이 끝난 뒤 순차적으로 배송되며, 정확한 배송 일정은 화면에 안내된 내용을 확인해주세요.",
  ],
  ["문의는 어떻게 하나요?", "하단 \"문의하기\" 버튼을 눌러 오픈채팅으로 연락주시면 됩니다."],
];

export default function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {FAQS.map(([q, a], idx) => {
        const open = openIdx === idx;
        return (
          <div key={q} className="overflow-hidden rounded-xl border border-neutral-200">
            <button
              type="button"
              onClick={() => setOpenIdx(open ? null : idx)}
              className="flex w-full items-center justify-between px-3.5 py-3 text-left text-sm"
            >
              <span>{q}</span>
              <ChevronDown
                size={16}
                className={`shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
            {open && (
              <div className="border-t border-neutral-100 px-3.5 py-3 text-xs leading-relaxed text-neutral-500">
                {a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
