"use client";

export default function KakaoContactButton({ url }: { url: string }) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="카카오 오픈채팅 문의"
      className="fixed bottom-24 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-[#FEE500] shadow-md"
      style={{ width: 52, height: 52 }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.86 5.32 4.65 6.73-.2.75-.73 2.71-.84 3.13-.13.52.19.51.4.37.16-.11 2.6-1.76 3.65-2.48.68.1 1.38.15 2.14.15 5.52 0 10-3.58 10-8s-4.48-8-10-8z"
          fill="#191600"
        />
      </svg>
    </a>
  );
}
