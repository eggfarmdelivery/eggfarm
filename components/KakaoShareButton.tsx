"use client";

import { Share2 } from "lucide-react";

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (options: {
          objectType: string;
          content: {
            title: string;
            description?: string;
            imageUrl: string;
            link: { mobileWebUrl: string; webUrl: string };
          };
          buttons?: {
            title: string;
            link: { mobileWebUrl: string; webUrl: string };
          }[];
        }) => void;
      };
    };
  }
}

function ensureKakaoInit() {
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!window.Kakao || !jsKey) return false;
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(jsKey);
  }
  return true;
}

export default function KakaoShareButton({
  title,
  description,
  imageUrl,
  path,
  label = "카톡으로 공유하기",
  className = "",
}: {
  title: string;
  description?: string;
  imageUrl: string;
  path: string; // 예: "/" 또는 "/b2c/order?campaign=xxx"
  label?: string;
  className?: string;
}) {
  function handleShare() {
    if (!ensureKakaoInit()) {
      alert("카카오 공유를 사용할 수 없어요. 잠시 후 다시 시도해주세요");
      return;
    }
    const url = `${window.location.origin}${path}`;
    window.Kakao!.Share.sendDefault({
      objectType: "feed",
      content: {
        title,
        description,
        imageUrl,
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [
        {
          title: "에그팜에서 보기",
          link: { mobileWebUrl: url, webUrl: url },
        },
      ],
    });
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`flex items-center gap-1.5 text-sm text-neutral-600 ${className}`}
    >
      <Share2 size={16} />
      {label}
    </button>
  );
}
