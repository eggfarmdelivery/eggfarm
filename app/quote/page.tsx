import QuoteForm from "./QuoteForm";

export default function QuotePage() {
  return (
    <div className="pb-10">
      <header className="px-5 py-4">
        <h1 className="text-base font-medium">견적 문의</h1>
        <p className="text-xs text-neutral-500 mt-1">
          비회원도 이용 가능해요. 담당자가 확인 후 직접 연락드려요.
        </p>
      </header>
      <QuoteForm />
    </div>
  );
}
